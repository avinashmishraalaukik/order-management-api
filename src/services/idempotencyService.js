// ─── Idempotency Service ──────────────────────────────────────────────────────
// Prevents duplicate order creation when clients retry failed requests.
//
// Clients send:  X-Idempotency-Key: <unique_string>
// First request: executes normally, caches the result under that key.
// Retry request: returns the cached result without re-running business logic.
//
// Keys expire after 24 hours (Stripe-style behavior).

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** @type {Map<string, { data: unknown, createdAt: number }>} */
const cache = new Map();

/**
 * Retrieve cached data for a key (returns null if missing or expired).
 * @param {string} key
 * @returns {unknown | null}
 */
export const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.createdAt > TTL_MS;
  if (isExpired) {
    cache.delete(key);
    return null;
  }

  return entry.data;
};

/**
 * Store data under a key.
 * @param {string}  key
 * @param {unknown} data
 */
export const set = (key, data) => {
  cache.set(key, { data, createdAt: Date.now() });
};

/** @param {string} key */
export const has = (key) => get(key) !== null;

/** Remove all entries older than TTL. */
export const purgeExpired = () => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.createdAt > TTL_MS) cache.delete(key);
  }
};

// Auto-purge once per hour in the background (unref so it doesn't block exit)
setInterval(purgeExpired, 60 * 60 * 1000).unref();
