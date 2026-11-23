// ─── Order Service ────────────────────────────────────────────────────────────
// All order business logic lives here. Controllers are intentionally thin
// and only handle HTTP concerns (status codes, response formatting).

import { v4 as uuidv4 }  from 'uuid';
import { orders, products, nextOrderNumber } from '../models/store.js';
import { ApiError }       from '../utils/ApiError.js';
import { paginate }       from '../utils/paginate.js';
import * as webhook       from './webhookService.js';
import * as idempotency   from './idempotencyService.js';

// ─── Order Status State Machine ───────────────────────────────────────────────
// Maps each status to the set of statuses it may legally transition to.
// Attempting any other transition returns HTTP 422.
const ALLOWED_TRANSITIONS = {
  pending:    ['confirmed', 'cancelled'],
  confirmed:  ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped:    ['delivered'],
  delivered:  [],   // terminal
  cancelled:  [],   // terminal
};

// ─── Tax rate (10%) ───────────────────────────────────────────────────────────
const TAX_RATE = 0.10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Enrich order items with product names and compute per-item totals.
 * @param {{ productId: string, productName?: string, quantity: number, unitPrice: number }[]} items
 * @returns {{ enrichedItems: object[], subtotal: number }}
 */
const enrichItems = (items) => {
  let subtotal = 0;

  const enrichedItems = items.map((item) => {
    const product     = products.get(item.productId);
    const productName = product?.name ?? item.productName ?? item.productId;
    const totalPrice  = +(item.quantity * item.unitPrice).toFixed(2);
    subtotal         += totalPrice;

    return { productId: item.productId, productName, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice };
  });

  return { enrichedItems, subtotal };
};

// ─── CRUD operations ──────────────────────────────────────────────────────────

/**
 * Create a new order.
 * Idempotency: if the same X-Idempotency-Key is reused, the cached order
 * is returned without creating a duplicate (Stripe-style).
 *
 * @param {object}       data
 * @param {string|null}  idempotencyKey
 * @returns {{ order: object, fromCache: boolean }}
 */
export const createOrder = async (data, idempotencyKey) => {
  // Return the cached response for repeated idempotent requests
  if (idempotencyKey) {
    const cached = idempotency.get(idempotencyKey);
    if (cached) return { order: cached.order, fromCache: true };
  }

  const { enrichedItems, subtotal } = enrichItems(data.items);

  const tax          = +(subtotal * TAX_RATE).toFixed(2);
  const shippingCost = +(data.shippingCost || 0).toFixed(2);
  const totalAmount  = +(subtotal + tax + shippingCost).toFixed(2);

  const order = {
    id:              uuidv4(),
    orderNumber:     nextOrderNumber(),
    customerId:      data.customerId,
    customerName:    data.customerName,
    customerEmail:   data.customerEmail,
    status:          'pending',
    items:           enrichedItems,
    subtotal:        +subtotal.toFixed(2),
    tax,
    shippingCost,
    totalAmount,
    shippingAddress: data.shippingAddress,
    notes:           data.notes || '',
    idempotencyKey:  idempotencyKey ?? null,
    statusHistory:   [{ status: 'pending', timestamp: new Date().toISOString(), note: 'Order created' }],
    createdAt:       new Date().toISOString(),
    updatedAt:       new Date().toISOString(),
  };

  orders.set(order.id, order);

  if (idempotencyKey) {
    idempotency.set(idempotencyKey, { order });
  }

  // Fire webhook asynchronously (setImmediate in webhookService — non-blocking)
  webhook.emit('order.created', {
    orderId: order.id, orderNumber: order.orderNumber,
    customerId: order.customerId, totalAmount: order.totalAmount, status: order.status,
  });

  return { order, fromCache: false };
};

/**
 * List orders with optional filters, sorting, and pagination.
 * @param {object} query - Validated + coerced query params
 */
export const getAllOrders = async (query) => {
  let items = Array.from(orders.values());

  // Amount range (not handled by the generic paginate helper)
  if (query.minAmount !== undefined) items = items.filter((o) => o.totalAmount >= query.minAmount);
  if (query.maxAmount !== undefined) items = items.filter((o) => o.totalAmount <= query.maxAmount);

  return paginate(items, query, ['status', 'customerId', 'customerName']);
};

/** @param {string} id @throws {ApiError} 404 if not found */
export const getOrderById = async (id) => {
  const order = orders.get(id);
  if (!order) throw ApiError.notFound('Order');
  return order;
};

/**
 * Transition an order to a new status.
 * Invalid transitions (e.g. delivered → pending) are rejected with 422.
 *
 * @param {string} id
 * @param {{ status: string, notes?: string }} data
 */
export const updateOrderStatus = async (id, data) => {
  const order = orders.get(id);
  if (!order) throw ApiError.notFound('Order');

  const allowedNext = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowedNext.includes(data.status)) {
    throw ApiError.unprocessable(
      `Cannot transition from '${order.status}' → '${data.status}'. ` +
      `Allowed: [${allowedNext.join(', ') || 'none — this is a terminal state'}]`,
    );
  }

  const prevStatus  = order.status;
  order.status      = data.status;
  order.updatedAt   = new Date().toISOString();
  order.statusHistory.push({
    status:    data.status,
    timestamp: new Date().toISOString(),
    note:      data.notes || '',
  });

  orders.set(id, order);

  webhook.emit('order.status_changed', {
    orderId: order.id, orderNumber: order.orderNumber,
    prevStatus, newStatus: data.status, customerId: order.customerId,
  });

  return order;
};

/**
 * Delete an order. Only pending or cancelled orders may be deleted.
 * @param {string} id
 */
export const deleteOrder = async (id) => {
  const order = orders.get(id);
  if (!order) throw ApiError.notFound('Order');

  if (!['pending', 'cancelled'].includes(order.status)) {
    throw ApiError.unprocessable(
      `Only pending or cancelled orders can be deleted. Current status: '${order.status}'`,
    );
  }

  orders.delete(id);

  webhook.emit('order.deleted', {
    orderId: order.id, orderNumber: order.orderNumber, customerId: order.customerId,
  });

  return { deleted: true, orderId: id };
};

/** Returns aggregate stats: total count, revenue, and breakdown by status. */
export const getOrderSummary = async () => {
  const allOrders = Array.from(orders.values());

  const summary = allOrders.reduce(
    (acc, order) => {
      acc.total++;
      acc.byStatus[order.status] = (acc.byStatus[order.status] || 0) + 1;
      if (order.status !== 'cancelled') acc.totalRevenue += order.totalAmount;
      return acc;
    },
    { total: 0, byStatus: {}, totalRevenue: 0 },
  );

  summary.totalRevenue = +summary.totalRevenue.toFixed(2);
  return summary;
};
