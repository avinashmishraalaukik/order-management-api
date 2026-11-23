// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// Caps requests per IP to prevent abuse.
// Configure via .env:  RATE_LIMIT_WINDOW_MS  RATE_LIMIT_MAX

import rateLimit  from 'express-rate-limit';
import { ApiResponse } from '../utils/ApiResponse.js';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60_000, // 1 minute
  max:      parseInt(process.env.RATE_LIMIT_MAX,        10) || 100,

  // Return standard RateLimit-* response headers
  standardHeaders: true,
  legacyHeaders:   false,

  // Skip health checks so they never count against the limit
  skip: (req) => req.path === '/health',

  handler: (_req, res) => {
    res.status(429).json(
      ApiResponse.error(
        'Too many requests. Please retry after a minute.',
        'RATE_LIMIT_EXCEEDED',
      ),
    );
  },
});
