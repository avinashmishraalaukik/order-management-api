// ─── ApiResponse ──────────────────────────────────────────────────────────────
// Builds the standard response envelope used by every endpoint.
//
// Success shape:
//   { success, message, data, meta: { timestamp, requestId } }
//
// Paginated shape:
//   { success, message, data, pagination, meta }
//
// Error shape:
//   { success, message, error: { code, details? }, meta }

import { v4 as uuidv4 } from 'uuid';

/** @returns {{ timestamp: string, requestId: string }} */
const buildMeta = () => ({
  timestamp: new Date().toISOString(),
  requestId: uuidv4(),
});

export const ApiResponse = {
  /**
   * Wrap a successful result.
   * @param {unknown} data
   * @param {string}  [message]
   */
  success(data = null, message = 'Success') {
    return {
      success: true,
      message,
      data,
      meta: buildMeta(),
    };
  },

  /**
   * Wrap a paginated list result.
   * @param {unknown[]} data
   * @param {{ total: number, page: number, limit: number, totalPages: number, hasNextPage: boolean, hasPrevPage: boolean }} pagination
   * @param {string} [message]
   */
  paginated(data, pagination, message = 'Fetched successfully') {
    return {
      success: true,
      message,
      data,
      pagination,
      meta: buildMeta(),
    };
  },

  /**
   * Wrap an error result.
   * @param {string}   message
   * @param {string}   [code]
   * @param {unknown}  [details]
   */
  error(message = 'Something went wrong', code = 'INTERNAL_ERROR', details = null) {
    const payload = {
      success: false,
      message,
      error: { code },
      meta: buildMeta(),
    };

    if (details !== null) {
      payload.error.details = details;
    }

    return payload;
  },
};
