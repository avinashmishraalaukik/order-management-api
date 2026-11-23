import { Router }    from 'express';
import { validate }  from '../../middleware/validate.js';
import * as ctrl     from '../../controllers/orderController.js';
import {
  CreateOrderSchema,
  UpdateStatusSchema,
  ListOrdersSchema,
} from '../../models/orderValidation.js';

const router = Router();

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List all orders
 *     description: Returns a paginated, filterable, and sortable list of orders.
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *       - in: query
 *         name: customerId
 *         schema: { type: string }
 *       - in: query
 *         name: customerName
 *         schema: { type: string }
 *         description: Partial match
 *       - in: query
 *         name: minAmount
 *         schema: { type: number }
 *       - in: query
 *         name: maxAmount
 *         schema: { type: number }
 *       - in: query
 *         name: createdFrom
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: createdTo
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Order' }
 */
router.get('/', validate(ListOrdersSchema, 'query'), ctrl.getAllOrders);

/**
 * @swagger
 * /api/v1/orders/summary:
 *   get:
 *     tags: [Orders]
 *     summary: Get order statistics
 *     description: Returns total count, revenue, and breakdown by status.
 *     responses:
 *       200:
 *         description: Order summary stats
 */
router.get('/summary', ctrl.getOrderSummary);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id', ctrl.getOrderById);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a new order
 *     description: |
 *       Creates an order. Supports **idempotency** via `X-Idempotency-Key` header.
 *       Resending the same key within 24 h returns the original order (HTTP 200)
 *       without creating a duplicate — identical to Stripe's behavior.
 *     parameters:
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreateOrderRequest' }
 *           example:
 *             customerId: cust_alice
 *             customerName: Alice Johnson
 *             customerEmail: alice@example.com
 *             items:
 *               - productId: prod_001
 *                 productName: Wireless Headphones
 *                 quantity: 1
 *                 unitPrice: 299.99
 *             shippingAddress:
 *               street: 123 Main St
 *               city: New York
 *               state: NY
 *               country: USA
 *               zipCode: "10001"
 *             shippingCost: 10
 *             notes: Please leave at door
 *     responses:
 *       201:
 *         description: Order created
 *       200:
 *         description: Idempotent replay — order already exists for this key
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', validate(CreateOrderSchema), ctrl.createOrder);

/**
 * @swagger
 * /api/v1/orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Transition order status
 *     description: |
 *       Valid transitions:
 *       - pending → confirmed | cancelled
 *       - confirmed → processing | cancelled
 *       - processing → shipped | cancelled
 *       - shipped → delivered
 *       - delivered / cancelled → (terminal, no further transitions)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateOrderStatusRequest' }
 *           example:
 *             status: confirmed
 *             notes: Payment verified
 *     responses:
 *       200:
 *         description: Status updated
 *       404:
 *         description: Order not found
 *       422:
 *         description: Invalid status transition
 */
router.patch('/:id/status', validate(UpdateStatusSchema), ctrl.updateOrderStatus);

/**
 * @swagger
 * /api/v1/orders/{id}:
 *   delete:
 *     tags: [Orders]
 *     summary: Delete an order
 *     description: Only `pending` or `cancelled` orders can be deleted.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 *       422:
 *         description: Order cannot be deleted in its current state
 */
router.delete('/:id', ctrl.deleteOrder);

export default router;
