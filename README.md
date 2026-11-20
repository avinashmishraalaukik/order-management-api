# 📦 Order Management REST API — Day 03

> Production-style REST API covering all **Day 03 — Advanced Backend Engineering** topics.

## 🚀 Quick Start

```bash
npm install
npm run dev        # development with nodemon
# or
npm start          # production
```

Open **http://localhost:3000/api-docs** for the interactive Swagger UI.

---

## 🏗️ Project Structure

```
day3Assignment/
├── server.js                    ← Entry point (graceful shutdown)
├── src/
│   ├── app.js                   ← Express setup (middleware, routes, 404)
│   ├── config/
│   │   └── swagger.js           ← Swagger/OpenAPI 3.0 spec
│   ├── routes/
│   │   ├── index.js             ← Versioned router (/api/v1/...)
│   │   └── v1/
│   │       ├── orderRoutes.js   ← Order endpoints + JSDoc annotations
│   │       ├── productRoutes.js ← Product endpoints + JSDoc annotations
│   │       └── webhookRoutes.js ← Webhook endpoints + JSDoc annotations
│   ├── controllers/
│   │   ├── orderController.js   ← Thin layer: calls service, formats response
│   │   ├── productController.js
│   │   └── webhookController.js
│   ├── services/
│   │   ├── orderService.js      ← Business logic + state machine + totals
│   │   ├── productService.js    ← Product CRUD with SKU uniqueness
│   │   ├── webhookService.js    ← Event emit, delivery, signature (Stripe-style)
│   │   └── idempotencyService.js← 24-hour idempotency cache with auto-purge
│   ├── models/
│   │   ├── store.js             ← In-memory data store (seeded products)
│   │   ├── orderValidation.js   ← Joi schemas: create, updateStatus, list
│   │   └── productValidation.js ← Joi schemas: create, update, list
│   ├── middleware/
│   │   ├── errorHandler.js      ← Centralized error handler
│   │   ├── rateLimiter.js       ← 100 req/min per IP
│   │   ├── requestLogger.js     ← Request ID + timing log
│   │   └── validate.js          ← Joi middleware factory
│   └── utils/
│       ├── ApiError.js          ← Custom error class with factory methods
│       ├── ApiResponse.js       ← Standard response envelope
│       ├── paginate.js          ← Pagination + filtering + sorting helper
│       └── logger.js            ← Leveled console logger
└── .env                         ← Environment configuration
```

---

## 📡 API Endpoints

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/orders` | List orders (paginated, filtered, sorted) |
| `POST` | `/api/v1/orders` | Create order (supports idempotency key) |
| `GET` | `/api/v1/orders/summary` | Stats: total, revenue, by-status |
| `GET` | `/api/v1/orders/:id` | Get order by ID |
| `PATCH` | `/api/v1/orders/:id/status` | Transition order status |
| `DELETE` | `/api/v1/orders/:id` | Delete order (pending/cancelled only) |

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/products` | List products (paginated, filtered) |
| `POST` | `/api/v1/products` | Create product (SKU unique) |
| `GET` | `/api/v1/products/:id` | Get product by ID |
| `PATCH` | `/api/v1/products/:id` | Update product (SKU immutable) |
| `DELETE` | `/api/v1/products/:id` | Delete product |

### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/webhooks/subscribe` | Register subscriber URL |
| `DELETE` | `/api/v1/webhooks/subscribe/:id` | Remove subscriber |
| `GET` | `/api/v1/webhooks/subscribers` | List all subscribers |
| `GET` | `/api/v1/webhooks/events` | View event log |
| `POST` | `/api/v1/webhooks/simulate` | Trigger a test event |
| `POST` | `/api/v1/webhooks/verify` | Verify HMAC signature |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/api` | Version discovery |
| `GET` | `/api-docs` | Swagger UI |

---

## 📐 Standard Response Structure

All responses follow a consistent envelope:

```json
// Success
{
  "success": true,
  "message": "Order created successfully",
  "data": { ... },
  "meta": {
    "timestamp": "2026-11-20T07:00:00.000Z",
    "requestId": "uuid-v4"
  }
}

// Paginated List
{
  "success": true,
  "message": "Orders fetched successfully",
  "data": [ ... ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}

// Error
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "customerEmail", "message": "must be a valid email" }
    ]
  },
  "meta": { "timestamp": "...", "requestId": "..." }
}
```

---

## 🔄 Order Status State Machine

```
pending ──→ confirmed ──→ processing ──→ shipped ──→ delivered
   │             │              │
   └─────────────┴──────────────┴──────────────────→ cancelled
```

Invalid transitions are rejected with `HTTP 422 UNPROCESSABLE_ENTITY`.

---

## 🔁 Idempotency (Stripe-style)

Prevent duplicate orders on network retries:

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "X-Idempotency-Key: order_xyz_$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

- Same key → same response (HTTP 200), no duplicate created
- Keys expire after 24 hours
- Safe to retry on network failure

---

## 🔔 Webhooks

### Register a subscriber
```bash
curl -X POST http://localhost:3000/api/v1/webhooks/subscribe \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://your-server.com/webhook", "events": ["order.created", "order.status_changed"] }'
```

### Events fired automatically
| Event | Trigger |
|-------|---------|
| `order.created` | New order placed |
| `order.status_changed` | Status updated |
| `order.deleted` | Order deleted |

### Signature Verification
Each delivery contains:
- `X-Webhook-Signature`: `HMAC-SHA256(secret, "${timestamp}.${body}")`
- `X-Webhook-Timestamp`: Unix ms timestamp

```js
const crypto = require('crypto');
const sig = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
  .update(`${timestamp}.${JSON.stringify(body)}`)
  .digest('hex');
```

---

## 🔍 Filtering & Pagination

```bash
# Paginate
GET /api/v1/orders?page=2&limit=5

# Sort
GET /api/v1/orders?sortBy=totalAmount&sortOrder=desc

# Filter
GET /api/v1/orders?status=pending&customerName=Alice

# Amount range
GET /api/v1/orders?minAmount=100&maxAmount=500

# Date range
GET /api/v1/orders?createdFrom=2026-11-01&createdTo=2026-11-30

# Combine
GET /api/v1/products?category=Electronics&isActive=true&minPrice=50&maxPrice=300&sortBy=price&sortOrder=asc
```

---

## 🛡️ Features Covered

| Feature | Implementation |
|---------|---------------|
| **CRUD APIs** | Orders + Products (full REST) |
| **Request Validation** | Joi schemas: type coercion, sanitization, all-errors mode |
| **Centralized Error Handling** | `errorHandler.js` middleware, `ApiError` class |
| **Pagination** | `paginate.js` utility — page/limit/sort/filter |
| **API Documentation** | Swagger UI at `/api-docs` (OpenAPI 3.0) |
| **Webhook Simulation** | HMAC-signed events, subscriber registry, retry logic |
| **Standard Response** | `ApiResponse` envelope with meta + requestId |
| **Idempotency** | `X-Idempotency-Key` header, 24h TTL cache |
| **Rate Limiting** | 100 req/min via `express-rate-limit` |
| **Status State Machine** | Stripe-style order lifecycle transitions |
| **API Versioning** | `/api/v1/...` prefix structure |
| **Security** | Helmet, CORS, payload size limit (10kb) |
| **Logging** | Request ID, timing, leveled console logger |

---

## 📋 Concepts from Day 03

| Topic | Where |
|-------|-------|
| Node.js Event Loop | `setImmediate` in `webhookService.js` for async delivery |
| Express Middleware | `helmet`, `cors`, `rateLimiter`, `validate`, `errorHandler` |
| REST Design | Resource-based URLs, correct HTTP verbs + status codes |
| API Versioning | `/api/v1/` namespace, version discovery on `GET /api` |
| Request Validation | Joi schemas with sanitization in `middleware/validate.js` |
| Centralized Error Handling | `middleware/errorHandler.js` with `ApiError` classification |
| Pagination / Sorting / Filtering | `utils/paginate.js` |
| Rate Limiting | `middleware/rateLimiter.js` |
| Swagger/OpenAPI | `config/swagger.js` + JSDoc annotations on all routes |
| Webhooks | `services/webhookService.js` |
| Idempotency & Retry | `X-Idempotency-Key`, `services/idempotencyService.js` |
| Stripe-style Payment Patterns | State machine + idempotency + webhook signing |
