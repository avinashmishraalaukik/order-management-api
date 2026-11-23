// ─── ApiError ─────────────────────────────────────────────────────────────────
// Custom error class that carries an HTTP status code and machine-readable
// error code. Services throw these; the central error handler catches them.
//
// isOperational = true  → expected, handled error (show message to client)
// isOperational = false → programming bug (hide details, log full stack)

export class ApiError extends Error {
  /**
   * @param {string}  message    - Human-readable description
   * @param {number}  statusCode - HTTP status code
   * @param {string}  code       - Machine-readable error code
   * @param {unknown} [details]  - Extra info (e.g. validation field errors)
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name          = 'ApiError';
    this.statusCode    = statusCode;
    this.code          = code;
    this.details       = details;
    this.isOperational = true;

    // Preserve proper stack trace in V8 (Node.js / Chrome)
    Error.captureStackTrace(this, this.constructor);
  }

  // ── Convenience factories ──────────────────────────────────────────────────

  /** 400 — The request body or parameters are malformed. */
  static badRequest(message, details = null) {
    return new ApiError(message, 400, 'BAD_REQUEST', details);
  }

  /** 400 — One or more fields failed schema validation. */
  static validationError(message, details = null) {
    return new ApiError(message, 400, 'VALIDATION_ERROR', details);
  }

  /** 404 — The requested resource does not exist. */
  static notFound(resource = 'Resource') {
    return new ApiError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  /** 409 — The request conflicts with existing state (e.g. duplicate SKU). */
  static conflict(message) {
    return new ApiError(message, 409, 'CONFLICT');
  }

  /** 422 — The request is well-formed but the action is not allowed. */
  static unprocessable(message, details = null) {
    return new ApiError(message, 422, 'UNPROCESSABLE_ENTITY', details);
  }

  /** 429 — The client has exceeded the rate limit. */
  static tooManyRequests() {
    return new ApiError('Too many requests. Please retry after a minute.', 429, 'RATE_LIMIT_EXCEEDED');
  }

  /** 500 — An unexpected server-side error occurred. */
  static internal(message = 'Internal server error') {
    const err          = new ApiError(message, 500, 'INTERNAL_ERROR');
    err.isOperational  = false; // hide details from client
    return err;
  }
}
