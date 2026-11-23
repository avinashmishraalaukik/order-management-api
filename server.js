// ─── Entry Point ──────────────────────────────────────────────────────────────
// dotenv must be the very first import so all env vars are
// available before any other module reads process.env.
import 'dotenv/config';

import { createServer }  from 'node:http';
import { app }           from './src/app.js';
import { logger }        from './src/utils/logger.js';

const PORT = process.env.PORT || 3080;
const ENV  = process.env.NODE_ENV || 'development';

const server = createServer(app);

server.listen(PORT, () => {
  logger.info('╔══════════════════════════════════════════════╗');
  logger.info('║       Order Management API — Day 03          ║');
  logger.info('╠══════════════════════════════════════════════╣');
  logger.info(`║  Environment : ${ENV.padEnd(28)}║`);
  logger.info(`║  Port        : ${String(PORT).padEnd(28)}║`);
  logger.info(`║  API Docs    : http://localhost:${PORT}/api-docs  ║`);
  logger.info(`║  Health      : http://localhost:${PORT}/health    ║`);
  logger.info('╚══════════════════════════════════════════════╝');
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`[Server] ${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ─── Unhandled Errors ─────────────────────────────────────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('[Server] Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});
