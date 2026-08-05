const { body } = require('express-validator');
const handleValidation = require('./handleValidation');
const {
  PRODUCT_CATEGORIES,
  mongoIdParam,
  priceField,
  stockField,
  discountField,
  imageUrlField,
  descriptionField,
  tagsField,
} = require('./common');

const nameField = body('name')
  .trim()
  .notEmpty()
  .withMessage('Product name is required')
  .isLength({ min: 2, max: 150 })
  .withMessage('Product name must be between 2 and 150 characters');

const categoryField = body('category')
  .trim()
  .notEmpty()
  .withMessage('Category is required')
  .isIn(PRODUCT_CATEGORIES)
  .withMessage(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`);

const createProductValidator = [
  nameField,
  descriptionField('description'),
  priceField('price'),
  categoryField,
  imageUrlField('image'),
  stockField('stock'),
  discountField('discount'),
  tagsField('tags'),
  handleValidation,
];

// Updates allow partial payloads (existing behavior), so fields are optional
// here but still validated when present. isAvailable/seller/salesCount/
// rating are intentionally NOT accepted from the client — see the
// whitelist applied in routes/products.js to prevent mass-assignment.
const updateProductValidator = [
  mongoIdParam('id'),
  body('name').optional().trim().isLength({ min: 2, max: 150 }).withMessage('Product name must be between 2 and 150 characters'),
  descriptionField('description'),
  body('price').optional().isFloat({ min: 0, max: 1000000 }).withMessage('Price must be a positive number'),
  body('category').optional().isIn(PRODUCT_CATEGORIES).withMessage(`Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`),
  imageUrlField('image'),
  body('stock').optional().isInt({ min: 0, max: 100000 }).withMessage('Stock must be a non-negative whole number'),
  discountField('discount'),
  tagsField('tags'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  handleValidation,
];

const productIdParamValidator = [mongoIdParam('id'), handleValidation];

module.exports = {
  createProductValidator,
  updateProductValidator,
  productIdParamValidator,
};
