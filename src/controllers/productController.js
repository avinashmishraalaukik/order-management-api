// ─── Product Controller ───────────────────────────────────────────────────────
// Thin HTTP layer — delegates entirely to productService.

import * as productService from '../services/productService.js';
import { ApiResponse }     from '../utils/ApiResponse.js';

// POST /api/v1/products
export const createProduct = async (req, res, next) => {
  try {
    const product = await productService.createProduct(req.body);
    return res.status(201).json(ApiResponse.success(product, 'Product created successfully'));
  } catch (err) { return next(err); }
};

// GET /api/v1/products
export const getAllProducts = async (req, res, next) => {
  try {
    const { data, pagination } = await productService.getAllProducts(req.query);
    return res.json(ApiResponse.paginated(data, pagination, 'Products fetched successfully'));
  } catch (err) { return next(err); }
};

// GET /api/v1/products/:id
export const getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return res.json(ApiResponse.success(product, 'Product fetched successfully'));
  } catch (err) { return next(err); }
};

// PATCH /api/v1/products/:id
export const updateProduct = async (req, res, next) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body);
    return res.json(ApiResponse.success(product, 'Product updated successfully'));
  } catch (err) { return next(err); }
};

// DELETE /api/v1/products/:id
export const deleteProduct = async (req, res, next) => {
  try {
    const result = await productService.deleteProduct(req.params.id);
    return res.json(ApiResponse.success(result, 'Product deleted successfully'));
  } catch (err) { return next(err); }
};
