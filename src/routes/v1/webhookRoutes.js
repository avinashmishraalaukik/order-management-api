import { Router } from 'express';
import * as ctrl  from '../../controllers/webhookController.js';

const router = Router();

/**
 * @swagger
 * /api/v1/webhooks/subscribe:
 *   post:
 *     tags: [Webhooks]
 *     summary: Register a webhook subscriber
 *     description: |
 *       Register a URL to receive webhook events. Each delivery is signed with
 *       HMAC-SHA256 and includes:
 *       - `X-Webhook-Signature`: hex signature
 *       - `X-Webhook-Timestamp`: Unix ms timestamp
 *
 *       **Verify:** `HMAC-SHA256(secret, "${timestamp}.${JSON.stringify(body)}")`
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://your-server.com/webhook
 *               events:
 *                 description: Event types to receive, or "*" for all
 *                 oneOf:
 *                   - type: string
 *                     enum: ["*"]
 *                   - type: array
 *                     items: { type: string }
 *                 example: ["order.created", "order.status_changed"]
 *     responses:
 *       201:
 *         description: Subscriber registered
 */
router.post('/subscribe', ctrl.subscribe);

/**
 * @swagger
 * /api/v1/webhooks/subscribe/{id}:
 *   delete:
 *     tags: [Webhooks]
 *     summary: Remove a webhook subscriber
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Subscriber removed
 *       404:
 *         description: Subscriber not found
 */
router.delete('/subscribe/:id', ctrl.unsubscribe);

/**
 * @swagger
 * /api/v1/webhooks/subscribers:
 *   get:
 *     tags: [Webhooks]
 *     summary: List all registered subscribers
 *     responses:
 *       200:
 *         description: Subscriber list
 */
router.get('/subscribers', ctrl.getSubscribers);

/**
 * @swagger
 * /api/v1/webhooks/events:
 *   get:
 *     tags: [Webhooks]
 *     summary: View the webhook event log
 *     description: Returns the last N events with delivery status and retry info.
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Webhook event log
 */
router.get('/events', ctrl.getEvents);

/**
 * @swagger
 * /api/v1/webhooks/simulate:
 *   post:
 *     tags: [Webhooks]
 *     summary: Simulate a webhook event
 *     description: |
 *       Manually emit any event for testing subscriber endpoints.
 *       Built-in events: `order.created`, `order.status_changed`,
 *       `order.deleted`, `test.ping`
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType: { type: string, example: test.ping }
 *               data:      { type: object, example: { message: "Hello!" } }
 *     responses:
 *       200:
 *         description: Event emitted and logged
 */
router.post('/simulate', ctrl.simulateEvent);

/**
 * @swagger
 * /api/v1/webhooks/verify:
 *   post:
 *     tags: [Webhooks]
 *     summary: Verify a webhook signature
 *     description: |
 *       Pass the headers and body exactly as received from a webhook delivery
 *       to confirm the payload was not tampered with.
 *     parameters:
 *       - in: header
 *         name: x-webhook-signature
 *         required: true
 *         schema: { type: string }
 *       - in: header
 *         name: x-webhook-timestamp
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Original webhook payload
 *     responses:
 *       200:
 *         description: Verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid: { type: boolean }
 */
router.post('/verify', ctrl.verifyWebhook);

export default router;
