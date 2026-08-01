const { body, param } = require('express-validator');
const handleValidation = require('./handleValidation');

const addToCartValidator = [
  body('productId').isMongoId().withMessage('Invalid product'),
  body('quantity').optional().isInt({ min: 1, max: 999 }).withMessage('Quantity must be between 1 and 999'),
  handleValidation,
];

const updateCartValidator = [
  body('productId').isMongoId().withMessage('Invalid product'),
  body('quantity').isInt({ min: 1, max: 999 }).withMessage('Quantity must be between 1 and 999'),
  handleValidation,
];

const removeFromCartValidator = [
  param('productId').isMongoId().withMessage('Invalid product'),
  handleValidation,
];

module.exports = {
  addToCartValidator,
  updateCartValidator,
  removeFromCartValidator,
};
