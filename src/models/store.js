// ─── In-Memory Data Store ─────────────────────────────────────────────────────
// Simulates a database for the assignment.
// In production: replace Maps with Mongoose/Prisma/Drizzle calls.

import { v4 as uuidv4 } from 'uuid';

const now = () => new Date().toISOString();

// ─── Products (pre-seeded) ────────────────────────────────────────────────────
export const products = new Map([
  ['prod_001', {
    id: 'prod_001', name: 'Wireless Headphones', sku: 'WH-PRO-XM5',
    description: 'Premium noise-cancelling headphones',
    price: 299.99, stock: 50, category: 'Electronics', isActive: true,
    createdAt: now(), updatedAt: now(),
  }],
  ['prod_002', {
    id: 'prod_002', name: 'Mechanical Keyboard', sku: 'KB-MECH-TKL',
    description: 'TKL mechanical keyboard with RGB',
    price: 129.99, stock: 120, category: 'Electronics', isActive: true,
    createdAt: now(), updatedAt: now(),
  }],
  ['prod_003', {
    id: 'prod_003', name: 'USB-C Hub', sku: 'USB-C-7PORT',
    description: '7-in-1 USB-C hub with 4K HDMI',
    price: 49.99, stock: 200, category: 'Accessories', isActive: true,
    createdAt: now(), updatedAt: now(),
  }],
  ['prod_004', {
    id: 'prod_004', name: 'Ergonomic Mouse', sku: 'MOUSE-ERG-MX',
    description: 'Vertical ergonomic wireless mouse',
    price: 79.99, stock: 80, category: 'Accessories', isActive: true,
    createdAt: now(), updatedAt: now(),
  }],
  ['prod_005', {
    id: 'prod_005', name: 'Standing Desk Mat', sku: 'MAT-STAND-L',
    description: 'Anti-fatigue mat for standing desks',
    price: 59.99, stock: 60, category: 'Office', isActive: false,
    createdAt: now(), updatedAt: now(),
  }],
]);

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = new Map();

// ─── Order number generator ───────────────────────────────────────────────────
let orderCounter = 1;

/** Returns a sequential, date-stamped order number: ORD-20261120-0001 */
export const nextOrderNumber = () => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seqPart  = String(orderCounter++).padStart(4, '0');
  return `ORD-${datePart}-${seqPart}`;
};

// ─── Webhook event log ────────────────────────────────────────────────────────
/** @type {Array<Record<string, unknown>>} */
export const webhookEvents = [];
