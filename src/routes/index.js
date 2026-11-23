// ─── API Router ───────────────────────────────────────────────────────────────
// Mounts all versioned sub-routers and exposes a version-discovery endpoint.

import { Router } from 'express';
import orderRoutes   from './v1/orderRoutes.js';
import productRoutes from './v1/productRoutes.js';
import webhookRoutes from './v1/webhookRoutes.js';

const router = Router();

// ── v1 routes ─────────────────────────────────────────────────────────────────
router.use('/v1/orders',   orderRoutes);
router.use('/v1/products', productRoutes);
router.use('/v1/webhooks', webhookRoutes);

// ── Version discovery ─────────────────────────────────────────────────────────
router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Order Management API',
    versions: {
      v1: {
        status:  'stable',
        baseUrl: '/api/v1',
        resources: ['orders', 'products', 'webhooks'],
      },
    },
    links: {
      docs:   '/api-docs',
      health: '/health',
    },
  });
});

export default router;
