// ─── Webhook Validation Schemas (Zod) ────────────────────────────────────────

import { z } from 'zod';

/** Used by POST /webhooks/subscribe */
export const SubscribeSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  events: z
    .union([
      z.literal('*'),
      z.array(z.string().min(1)).min(1, 'Provide at least one event type'),
    ])
    .default('*'),
});

/** Used by POST /webhooks/simulate */
export const SimulateEventSchema = z.object({
  eventType: z.string().min(1).default('test.ping'),
  data:      z.record(z.unknown()).default({}),
});
