// ─── Request Logger ───────────────────────────────────────────────────────────
// Attaches a unique requestId to every request so logs and responses
// can be correlated across services.

import { v4 as uuidv4 } from 'uuid';

export const requestLogger = (req, _res, next) => {
  req.requestId  = uuidv4();
  req.receivedAt = Date.now();

  _res.on('finish', () => {
    const ms    = Date.now() - req.receivedAt;
    const level = _res.statusCode >= 500 ? 'ERROR'
                : _res.statusCode >= 400 ? 'WARN'
                : 'INFO';

    console.log(
      `[${level}] ${req.method} ${req.originalUrl} → ${_res.statusCode} (${ms}ms) [req:${req.requestId}]`,
    );
  });

  next();
};
