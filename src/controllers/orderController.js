// ─── Order Controller ─────────────────────────────────────────────────────────
// Thin HTTP layer: delegates to orderService, formats responses.
// No business logic here — keep controllers free of domain rules.

import * as orderService from '../services/orderService.js';
import { ApiResponse }   from '../utils/ApiResponse.js';

// POST /api/v1/orders
export const createOrder = async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key'] ?? null;
    const { order, fromCache } = await orderService.createOrder(req.body, idempotencyKey);

    // 201 on first creation, 200 on idempotent replay
    const statusCode = fromCache ? 200 : 201;
    const message    = fromCache
      ? 'Order already created (idempotent response)'
      : 'Order created successfully';

    return res.status(statusCode).json(ApiResponse.success(order, message));
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/orders
export const getAllOrders = async (req, res, next) => {
  try {
    const { data, pagination } = await orderService.getAllOrders(req.query);
    return res.json(ApiResponse.paginated(data, pagination, 'Orders fetched successfully'));
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/orders/summary
export const getOrderSummary = async (req, res, next) => {
  try {
    const summary = await orderService.getOrderSummary();
    return res.json(ApiResponse.success(summary, 'Order summary fetched'));
  } catch (err) {
    return next(err);
  }
};

// GET /api/v1/orders/:id
export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    return res.json(ApiResponse.success(order, 'Order fetched successfully'));
  } catch (err) {
    return next(err);
  }
};

// PATCH /api/v1/orders/:id/status
export const updateOrderStatus = async (req, res, next) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body);
    return res.json(ApiResponse.success(order, `Order status updated to '${order.status}'`));
  } catch (err) {
    return next(err);
  }
};

// DELETE /api/v1/orders/:id
export const deleteOrder = async (req, res, next) => {
  try {
    const result = await orderService.deleteOrder(req.params.id);
    return res.json(ApiResponse.success(result, 'Order deleted successfully'));
  } catch (err) {
    return next(err);
  }
};
