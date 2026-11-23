// ─── Product Service ──────────────────────────────────────────────────────────
// Business logic for product catalog management.

import { v4 as uuidv4 } from 'uuid';
import { products }      from '../models/store.js';
import { ApiError }      from '../utils/ApiError.js';
import { paginate }      from '../utils/paginate.js';

/** @param {object} data - Validated CreateProductSchema output */
export const createProduct = async (data) => {
  // SKU must be globally unique
  const skuExists = Array.from(products.values()).some((p) => p.sku === data.sku);
  if (skuExists) {
    throw ApiError.conflict(`A product with SKU '${data.sku}' already exists`);
  }

  const product = {
    id:          uuidv4(),
    name:        data.name,
    sku:         data.sku,       // already uppercased by Zod transform
    description: data.description || '',
    price:       data.price,
    stock:       data.stock,
    category:    data.category,
    isActive:    data.isActive ?? true,
    createdAt:   new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  products.set(product.id, product);
  return product;
};

/** @param {object} query - Validated ListProductsSchema output */
export const getAllProducts = async (query) => {
  let items = Array.from(products.values());

  // Boolean and price-range filters are not handled by the generic paginate helper
  if (query.isActive !== undefined) items = items.filter((p) => p.isActive === query.isActive);
  if (query.minPrice !== undefined) items = items.filter((p) => p.price >= query.minPrice);
  if (query.maxPrice !== undefined) items = items.filter((p) => p.price <= query.maxPrice);

  return paginate(items, query, ['name', 'category']);
};

/** @param {string} id @throws {ApiError} 404 if not found */
export const getProductById = async (id) => {
  const product = products.get(id);
  if (!product) throw ApiError.notFound('Product');
  return product;
};

/**
 * Partial update — SKU is intentionally immutable after creation.
 * @param {string} id
 * @param {object} data - Validated UpdateProductSchema output
 */
export const updateProduct = async (id, data) => {
  const existing = products.get(id);
  if (!existing) throw ApiError.notFound('Product');

  const updated = {
    ...existing,
    ...data,
    id,                               // prevent overwriting id
    sku:       existing.sku,          // SKU is immutable
    createdAt: existing.createdAt,    // immutable
    updatedAt: new Date().toISOString(),
  };

  products.set(id, updated);
  return updated;
};

/** @param {string} id */
export const deleteProduct = async (id) => {
  const product = products.get(id);
  if (!product) throw ApiError.notFound('Product');

  products.delete(id);
  return { deleted: true, productId: id };
};
