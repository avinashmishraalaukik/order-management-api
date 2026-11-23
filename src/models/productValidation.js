// ─── Product Validation Schemas (Zod) ────────────────────────────────────────

import { z } from 'zod';

/** Used by POST /products */
export const CreateProductSchema = z.object({
  name:        z.string().trim().min(2).max(200),
  sku:         z.string().trim().min(2).max(100).transform((v) => v.toUpperCase()),
  description: z.string().trim().max(1000).optional().default(''),
  price:       z.number().positive('Price must be greater than 0'),
  stock:       z.number().int().min(0, 'Stock cannot be negative'),
  category:    z.string().trim().min(2).max(100),
  isActive:    z.boolean().default(true),
});

/** Used by PATCH /products/:id  — requires at least one field */
export const UpdateProductSchema = z
  .object({
    name:        z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    price:       z.number().positive().optional(),
    stock:       z.number().int().min(0).optional(),
    category:    z.string().trim().min(2).max(100).optional(),
    isActive:    z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided for update' },
  );

/** Used to validate GET /products query params */
export const ListProductsSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(10),
  sortBy:    z.enum(['name', 'price', 'stock', 'createdAt', 'category']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  name:      z.string().optional(),
  category:  z.string().optional(),
  isActive:  z.coerce.boolean().optional(),
  minPrice:  z.coerce.number().min(0).optional(),
  maxPrice:  z.coerce.number().min(0).optional(),
});
