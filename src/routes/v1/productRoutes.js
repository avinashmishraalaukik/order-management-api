import { Router }   from 'express';
import { validate } from '../../middleware/validate.js';
import * as ctrl    from '../../controllers/productController.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ListProductsSchema,
} from '../../models/productValidation.js';

const router = Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: List all products
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *       - $ref: '#/components/parameters/SortByParam'
 *       - $ref: '#/components/parameters/SortOrderParam'
 *       - in: query
 *         name: name
 *         schema: { type: string }
 *         description: Partial match on product name
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: isActive
 *         schema: { type: boolean }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Product' }
 */
router.get('/', validate(ListProductsSchema, 'query'), ctrl.getAllProducts);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     tags: [Products]
 *     summary: Get product by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Product not found
 */
router.get('/:id', ctrl.getProductById);

/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     tags: [Products]
 *     summary: Create a new product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, price, stock, category]
 *             properties:
 *               name:        { type: string, example: Gaming Monitor }
 *               sku:         { type: string, example: MON-4K-27 }
 *               description: { type: string }
 *               price:       { type: number, example: 349.99 }
 *               stock:       { type: integer, example: 30 }
 *               category:    { type: string, example: Electronics }
 *               isActive:    { type: boolean, default: true }
 *     responses:
 *       201:
 *         description: Product created
 *       409:
 *         description: SKU already exists
 */
router.post('/', validate(CreateProductSchema), ctrl.createProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   patch:
 *     tags: [Products]
 *     summary: Update a product (partial)
 *     description: SKU is immutable after creation.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:        { type: string }
 *               description: { type: string }
 *               price:       { type: number }
 *               stock:       { type: integer }
 *               category:    { type: string }
 *               isActive:    { type: boolean }
 *     responses:
 *       200:
 *         description: Product updated
 *       404:
 *         description: Product not found
 */
router.patch('/:id', validate(UpdateProductSchema), ctrl.updateProduct);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   delete:
 *     tags: [Products]
 *     summary: Delete a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *       404:
 *         description: Product not found
 */
router.delete('/:id', ctrl.deleteProduct);

export default router;
