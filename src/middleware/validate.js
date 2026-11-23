// ─── Validation Middleware ────────────────────────────────────────────────────
// Zod-based factory that validates req.body, req.query, or req.params.
//
// Usage:
//   router.post('/orders', validate(CreateOrderSchema), controller.create);
//   router.get('/orders',  validate(ListOrdersSchema, 'query'), controller.list);

import { ZodError } from 'zod';
import { ApiError }  from '../utils/ApiError.js';

/**
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source]
 */
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source]);

  if (!result.success) {
    // Map Zod issues → { field, message } pairs for the error response
    const details = result.error.errors.map((issue) => ({
      field:   issue.path.join('.') || 'root',
      message: issue.message,
    }));

    return next(ApiError.validationError('Validation failed', details));
  }

  // Replace source with the parsed + sanitized + defaulted values
  req[source] = result.data;
  return next();
};
