// ─── Swagger / OpenAPI 3.0 Spec ───────────────────────────────────────────────
// swagger-jsdoc reads JSDoc annotations from the route files
// and merges them with the base definition below.

import { fileURLToPath } from 'node:url';
import path              from 'node:path';
import swaggerJsdoc      from 'swagger-jsdoc';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Order Management API',
    version: '1.0.0',
    description: `
## Production-style Order Management REST API — Day 03

### Features
- ✅ Full CRUD — Orders & Products
- ✅ Zod request validation (all fields documented)
- ✅ Centralized error handling
- ✅ Pagination · sorting · filtering
- ✅ Rate limiting — 100 req/min
- ✅ Idempotency keys (Stripe-style)
- ✅ Webhook simulation with HMAC signing
- ✅ Standard response envelope

### Standard Response Envelope
\`\`\`json
{
  "success": true,
  "message": "...",
  "data": { },
  "meta": { "timestamp": "...", "requestId": "..." }
}
\`\`\`
    `,
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Local development' },
  ],
  components: {
    schemas: {
      // ── Standard envelopes ────────────────────────────────────────────
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string',  example: 'Success' },
          data:    { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success:  { type: 'boolean' },
          message:  { type: 'string' },
          data:     { type: 'array', items: {} },
          pagination: {
            type: 'object',
            properties: {
              total:       { type: 'integer', example: 100 },
              page:        { type: 'integer', example: 1 },
              limit:       { type: 'integer', example: 10 },
              totalPages:  { type: 'integer', example: 10 },
              hasNextPage: { type: 'boolean', example: true },
              hasPrevPage: { type: 'boolean', example: false },
            },
          },
          meta: { type: 'object' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string',  example: 'Validation failed' },
          error: {
            type: 'object',
            properties: {
              code:    { type: 'string', example: 'VALIDATION_ERROR' },
              details: { type: 'array',  items: { type: 'object' } },
            },
          },
          meta: { type: 'object' },
        },
      },
      // ── Domain schemas ────────────────────────────────────────────────
      Address: {
        type: 'object',
        required: ['street', 'city', 'state', 'country', 'zipCode'],
        properties: {
          street:  { type: 'string', example: '123 Main St' },
          city:    { type: 'string', example: 'New York' },
          state:   { type: 'string', example: 'NY' },
          country: { type: 'string', example: 'USA' },
          zipCode: { type: 'string', example: '10001' },
        },
      },
      OrderItem: {
        type: 'object',
        properties: {
          productId:   { type: 'string', example: 'prod_001' },
          productName: { type: 'string', example: 'Wireless Headphones' },
          quantity:    { type: 'integer', example: 2 },
          unitPrice:   { type: 'number',  example: 99.99 },
          totalPrice:  { type: 'number',  example: 199.98 },
        },
      },
      Order: {
        type: 'object',
        properties: {
          id:             { type: 'string', format: 'uuid' },
          orderNumber:    { type: 'string', example: 'ORD-20261120-0001' },
          customerId:     { type: 'string', example: 'cust_alice' },
          customerName:   { type: 'string', example: 'Alice Johnson' },
          customerEmail:  { type: 'string', format: 'email' },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
          },
          items:           { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
          subtotal:        { type: 'number', example: 199.98 },
          tax:             { type: 'number', example: 20.00 },
          shippingCost:    { type: 'number', example: 10.00 },
          totalAmount:     { type: 'number', example: 229.98 },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          notes:           { type: 'string' },
          idempotencyKey:  { type: 'string', nullable: true },
          statusHistory:   { type: 'array', items: { type: 'object' } },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },
      CreateOrderRequest: {
        type: 'object',
        required: ['customerId', 'customerName', 'customerEmail', 'items', 'shippingAddress'],
        properties: {
          customerId:      { type: 'string', example: 'cust_alice' },
          customerName:    { type: 'string', example: 'Alice Johnson' },
          customerEmail:   { type: 'string', format: 'email', example: 'alice@example.com' },
          items: {
            type: 'array', minItems: 1,
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPrice'],
              properties: {
                productId:   { type: 'string' },
                productName: { type: 'string' },
                quantity:    { type: 'integer', minimum: 1 },
                unitPrice:   { type: 'number',  minimum: 0 },
              },
            },
          },
          shippingAddress: { $ref: '#/components/schemas/Address' },
          shippingCost:    { type: 'number', minimum: 0, example: 10 },
          notes:           { type: 'string', maxLength: 500 },
        },
      },
      UpdateOrderStatusRequest: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
          },
          notes: { type: 'string', maxLength: 500 },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          name:        { type: 'string', example: 'Wireless Headphones' },
          sku:         { type: 'string', example: 'WH-PRO-XM5' },
          description: { type: 'string' },
          price:       { type: 'number', example: 299.99 },
          stock:       { type: 'integer', example: 50 },
          category:    { type: 'string', example: 'Electronics' },
          isActive:    { type: 'boolean', example: true },
          createdAt:   { type: 'string', format: 'date-time' },
          updatedAt:   { type: 'string', format: 'date-time' },
        },
      },
      WebhookPayload: {
        type: 'object',
        properties: {
          id:         { type: 'string', example: 'evt_abc123' },
          type:       { type: 'string', example: 'order.created' },
          data:       { type: 'object' },
          timestamp:  { type: 'string', format: 'date-time' },
          signature:  { type: 'string' },
          deliveries: { type: 'array', items: { type: 'object' } },
        },
      },
    },
    parameters: {
      PageParam: {
        in: 'query', name: 'page',
        schema: { type: 'integer', default: 1, minimum: 1 },
        description: 'Page number (1-based)',
      },
      LimitParam: {
        in: 'query', name: 'limit',
        schema: { type: 'integer', default: 10, minimum: 1, maximum: 100 },
        description: 'Items per page',
      },
      SortByParam: {
        in: 'query', name: 'sortBy',
        schema: { type: 'string', default: 'createdAt' },
        description: 'Field to sort by',
      },
      SortOrderParam: {
        in: 'query', name: 'sortOrder',
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        description: 'Sort direction',
      },
      IdempotencyKey: {
        in: 'header', name: 'X-Idempotency-Key',
        schema: { type: 'string' },
        description: 'Unique key to prevent duplicate order creation on retries',
      },
    },
  },
  tags: [
    { name: 'Orders',   description: 'Order lifecycle management' },
    { name: 'Products', description: 'Product catalog' },
    { name: 'Webhooks', description: 'Event delivery & subscriber management' },
  ],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: [path.resolve(__dirname, '../routes/**/*.js')],
});
