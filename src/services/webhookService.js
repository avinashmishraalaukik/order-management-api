// ─── Webhook Service ──────────────────────────────────────────────────────────
// Stripe-inspired outbound webhook system.
//
// Flow:
//   1. Business logic calls emit(eventType, data).
//   2. The event is logged to the in-memory store.
//   3. setImmediate schedules async delivery to all matching subscribers.
//   4. Each delivery is retried up to 3 times on simulated failure.
//
// Signature scheme (identical to Stripe):
//   HMAC-SHA256( WEBHOOK_SECRET, "${timestamp}.${JSON.stringify(payload)}" )

import crypto       from 'node:crypto';
import { v4 as uuidv4 }  from 'uuid';
import { webhookEvents } from '../models/store.js';
import { logger }        from '../utils/logger.js';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'whsec_default_secret';

// ── Subscriber registry (in production: stored in DB) ─────────────────────────
/** @type {Map<string, { id: string, url: string, events: string | string[], createdAt: string }>} */
const subscribers = new Map();

// ─── Signature helpers ────────────────────────────────────────────────────────

/**
 * Compute the HMAC-SHA256 signature for a payload.
 * @param {unknown} payload
 * @param {number}  timestamp - Unix ms
 * @returns {string} hex digest
 */
export const signPayload = (payload, timestamp) => {
  const toSign = `${timestamp}.${JSON.stringify(payload)}`;
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(toSign).digest('hex');
};

/**
 * Verify that an incoming signature matches the expected one.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {string} rawBody    - Original stringified JSON body
 * @param {string} signature  - Hex signature from the X-Webhook-Signature header
 * @param {number} timestamp  - From the X-Webhook-Timestamp header
 */
export const verifySignature = (rawBody, signature, timestamp) => {
  try {
    const expected = signPayload(JSON.parse(rawBody), timestamp);

    // Signatures must be the same byte length for timingSafeEqual
    if (signature.length !== expected.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected,  'hex'),
    );
  } catch {
    return false;
  }
};

// ─── Delivery simulation ──────────────────────────────────────────────────────

/**
 * Simulate HTTP POST delivery to a subscriber with retry logic.
 * @param {{ id: string, url: string }} event
 * @param {number} timestamp
 */
const deliverToSubscribers = (event, timestamp) => {
  for (const [subId, sub] of subscribers.entries()) {
    // Skip if the subscriber filters by event type
    if (sub.events !== '*' && !sub.events.includes(event.type)) continue;

    // Simulate 90% delivery success rate
    const succeeded = Math.random() > 0.10;

    const delivery = {
      subscriberId: subId,
      url:          sub.url,
      attemptedAt:  new Date().toISOString(),
      httpStatus:   succeeded ? 200 : 500,
      status:       succeeded ? 'delivered' : 'failed',
      retries:      0,
    };

    // Retry up to 3 times on failure (exponential back-off omitted for simulation)
    if (!succeeded) {
      let recovered = false;
      for (let attempt = 1; attempt <= 3; attempt++) {
        delivery.retries = attempt;
        if (Math.random() > 0.4) { // ~60% chance to recover on each retry
          delivery.status    = `delivered (retry ${attempt})`;
          delivery.httpStatus = 200;
          recovered          = true;
          break;
        }
      }
      if (!recovered) delivery.status = 'failed_after_retries';
    }

    event.deliveries.push(delivery);
    logger.info(`[Webhook] ${delivery.status} → ${sub.url} [${event.id}]`);
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Emit a webhook event and schedule async delivery.
 * @param {string}  eventType
 * @param {unknown} data
 */
export const emit = (eventType, data) => {
  const timestamp = Date.now();
  const eventId   = `evt_${uuidv4().replace(/-/g, '').slice(0, 24)}`;

  const event = {
    id:         eventId,
    type:       eventType,
    data,
    timestamp:  new Date(timestamp).toISOString(),
    signature:  signPayload(data, timestamp),
    deliveries: [],
  };

  webhookEvents.push(event);
  logger.info(`[Webhook] Event emitted: ${eventType} [${eventId}]`);

  // Use setImmediate so delivery runs after the current call stack clears
  // (non-blocking — the HTTP response is sent before delivery starts)
  setImmediate(() => {
    if (subscribers.size === 0) {
      logger.debug(`[Webhook] No subscribers registered for event "${eventType}"`);
      return;
    }
    deliverToSubscribers(event, timestamp);
  });

  return event;
};

/** @param {string} url @param {string | string[]} events */
export const subscribe = (url, events = '*') => {
  const id  = `sub_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const sub = { id, url, events, createdAt: new Date().toISOString() };
  subscribers.set(id, sub);
  return sub;
};

/** @param {string} id @returns {boolean} */
export const unsubscribe = (id) => {
  if (!subscribers.has(id)) return false;
  subscribers.delete(id);
  return true;
};

/** @returns {Array} */
export const getSubscribers = () => Array.from(subscribers.values());

/**
 * Return the most recent webhook events (newest first).
 * @param {number} [limit]
 */
export const getEvents = (limit = 50) =>
  webhookEvents.slice(-limit).reverse();
