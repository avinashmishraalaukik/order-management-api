// ─── Order Validation Schemas (Zod) ───────────────────────────────────────────
// All schemas use z.object so Zod strips unknown fields automatically
// (strict mode). Coerce is used for query-string numbers so "1" → 1.

import { z } from 'zod';

// ── Allowed status values (single source of truth) ────────────────────────────
export const ORDER_STATUS_VALUES = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

// ── Reusable sub-schemas ──────────────────────────────────────────────────────
const AddressSchema = z.object({
  street:  z.string().trim().min(3, 'Street must be at least 3 chars').max(200),
  city:    z.string().trim().min(2).max(100),
  state:   z.string().trim().min(2).max(100),
  country: z.string().trim().min(2).max(100),
  zipCode: z.string().trim().min(3).max(20),
});

const OrderItemSchema = z.object({
  productId:   z.string().trim().min(1, 'productId is required'),
  productName: z.string().trim().max(200).optional(),
  quantity:    z.number({ required_error: 'quantity is required' }).int().min(1).max(1000),
  unitPrice:   z.number({ required_error: 'unitPrice is required' }).positive('unitPrice must be > 0'),
});

// ── Exported schemas ──────────────────────────────────────────────────────────

/** Used by POST /orders */
export const CreateOrderSchema = z.object({
  customerId:      z.string().trim().min(3).max(100),
  customerName:    z.string().trim().min(2).max(200),
  customerEmail:   z.string().email('Must be a valid email address'),
  items:           z.array(OrderItemSchema).min(1, 'At least one order item is required'),
  shippingAddress: AddressSchema,
  shippingCost:    z.number().min(0).default(0),
  notes:           z.string().trim().max(500).optional().default(''),
});

/** Used by PATCH /orders/:id/status */
export const UpdateStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_VALUES, {
    errorMap: () => ({ message: `Status must be one of: ${ORDER_STATUS_VALUES.join(', ')}` }),
  }),
  notes: z.string().trim().max(500).optional().default(''),
});

/** Used to validate GET /orders query params (all fields are optional + coerced) */
export const ListOrdersSchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100).default(10),
  sortBy:       z.enum(['createdAt', 'updatedAt', 'totalAmount', 'status', 'orderNumber']).default('createdAt'),
  sortOrder:    z.enum(['asc', 'desc']).default('desc'),
  status:       z.enum(ORDER_STATUS_VALUES).optional(),
  customerId:   z.string().optional(),
  customerName: z.string().optional(),
  createdFrom:  z.string().optional(),
  createdTo:    z.string().optional(),
  minAmount:    z.coerce.number().min(0).optional(),
  maxAmount:    z.coerce.number().min(0).optional(),
});
