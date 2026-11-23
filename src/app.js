// ─── Express Application ──────────────────────────────────────────────────────
// Configures all middleware, mounts routes, and exports the app.
// server.js is responsible for binding to a port.

import express      from 'express';
import cors         from 'cors';
import helmet       from 'helmet';
import morgan       from 'morgan';
import swaggerUi    from 'swagger-ui-express';

import { swaggerSpec }   from './config/swagger.js';
import { rateLimiter }   from './middleware/rateLimiter.js';
import { errorHandler }  from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { ApiResponse }   from './utils/ApiResponse.js';
import router            from './routes/index.js';

export const app = express();

// ─── Security & Core Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(requestLogger);

// ─── Rate Limiting (applied to all /api/* routes) ─────────────────────────────
app.use('/api/', rateLimiter);

// ─── API Documentation ────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss:      '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Order Management API Docs',
}));

// Raw OpenAPI JSON (useful for client code-gen tools)
app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json(ApiResponse.success(
    {
      status:      'healthy',
      uptime:      `${process.uptime().toFixed(2)}s`,
      environment: process.env.NODE_ENV ?? 'development',
      version:     '1.0.0',
    },
    'Service is healthy',
  ));
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', router);

// ─── 404 — Unknown Route ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json(
    ApiResponse.error(
      `Route ${req.method} ${req.originalUrl} not found`,
      'NOT_FOUND',
    ),
  );
});

// ─── Centralized Error Handler (must be last) ─────────────────────────────────
app.use(errorHandler);
