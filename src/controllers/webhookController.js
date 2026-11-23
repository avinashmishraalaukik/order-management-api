// ─── Webhook Controller ───────────────────────────────────────────────────────
// Manages webhook subscribers, exposes the event log, handles signature
// verification, and allows manual event simulation.

import * as webhookService from '../services/webhookService.js';
import { ApiResponse }     from '../utils/ApiResponse.js';
import { ApiError }        from '../utils/ApiError.js';
import { validate }        from '../middleware/validate.js';
import { SubscribeSchema, SimulateEventSchema } from '../models/webhookValidation.js';

// POST /api/v1/webhooks/subscribe
export const subscribe = [
  validate(SubscribeSchema),
  async (req, res, next) => {
    try {
      const sub = webhookService.subscribe(req.body.url, req.body.events);
      return res.status(201).json(ApiResponse.success(sub, 'Webhook subscriber registered'));
    } catch (err) { return next(err); }
  },
];

// DELETE /api/v1/webhooks/subscribe/:id
export const unsubscribe = async (req, res, next) => {
  try {
    const removed = webhookService.unsubscribe(req.params.id);
    if (!removed) throw ApiError.notFound('Webhook subscriber');
    return res.json(ApiResponse.success({ removed: true }, 'Subscriber removed'));
  } catch (err) { return next(err); }
};

// GET /api/v1/webhooks/subscribers
export const getSubscribers = (_req, res, next) => {
  try {
    const subs = webhookService.getSubscribers();
    return res.json(ApiResponse.success(subs, `${subs.length} subscriber(s) registered`));
  } catch (err) { return next(err); }
};

// GET /api/v1/webhooks/events
export const getEvents = (req, res, next) => {
  try {
    const limit  = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const events = webhookService.getEvents(limit);
    return res.json(ApiResponse.success(events, `Last ${events.length} webhook event(s)`));
  } catch (err) { return next(err); }
};

// POST /api/v1/webhooks/simulate
export const simulateEvent = [
  validate(SimulateEventSchema),
  async (req, res, next) => {
    try {
      const { eventType, data } = req.body;
      const event = webhookService.emit(eventType, data);
      return res.json(ApiResponse.success(event, `Webhook event '${eventType}' simulated`));
    } catch (err) { return next(err); }
  },
];

// POST /api/v1/webhooks/verify
export const verifyWebhook = (req, res, next) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      throw ApiError.badRequest(
        'Both x-webhook-signature and x-webhook-timestamp headers are required',
      );
    }

    const rawBody = JSON.stringify(req.body);
    const isValid = webhookService.verifySignature(rawBody, signature, Number(timestamp));

    return res.json(
      ApiResponse.success(
        { valid: isValid },
        isValid ? 'Signature verified ✓' : 'Signature is invalid ✗',
      ),
    );
  } catch (err) { return next(err); }
};
