// ─── Centralized Error Handler ────────────────────────────────────────────────
// The LAST middleware in the Express chain.
// All errors passed via next(err) end up here.
//
// Error classification:
//   ApiError (isOperational)  → known, expected error  → show message + code
//   ZodError                  → validation from schema  → format and rethrow
//   JSON parse errors         → 400
//   Everything else           → 500, hide internals in production

import { ZodError }   from 'zod';
import { ApiError }   from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { logger }      from '../utils/logger.js';

/**
 * Transform a ZodError into a structured ApiError.
 * @param {ZodError} zodErr
 * @returns {ApiError}
 */
const fromZodError = (zodErr) => {
  const details = zodErr.errors.map((issue) => ({
    field:   issue.path.join('.') || 'root',
    message: issue.message,
  }));
  return ApiError.validationError('Validation failed', details);
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  // ── Normalize known error types ─────────────────────────────────────────
  if (err instanceof ZodError) {
    err = fromZodError(err);
  } else if (err.type === 'entity.parse.failed') {
    err = ApiError.badRequest('Invalid JSON in request body');
  } else if (err.type === 'entity.too.large') {
    err = ApiError.badRequest('Request body exceeds the 10 KB limit');
  }

  // ── Determine response values ───────────────────────────────────────────
  const isOperational = err instanceof ApiError && err.isOperational;
  const statusCode    = err.statusCode ?? 500;
  const message       = isOperational ? err.message : 'An unexpected error occurred';
  const code          = err.code      ?? 'INTERNAL_ERROR';
  const details       = err.details   ?? null;

  // ── Logging ─────────────────────────────────────────────────────────────
  if (isOperational) {
    logger.warn(`[ErrorHandler] ${statusCode} ${code}: ${err.message}`);
  } else {
    logger.error('[ErrorHandler] Unexpected error:', err);
  }

  res.status(statusCode).json(ApiResponse.error(message, code, details));
};
