const { body, param, query } = require('express-validator');

// Matches the User model's enum exactly — keep in sync with models/User.js
const USER_ROLES = ['customer', 'seller', 'admin'];
// Matches the Product model's enum exactly — keep in sync with models/Product.js
const PRODUCT_CATEGORIES = ['chips', 'kurkure', 'biscuits', 'chocolates', 'noodles', 'other'];
// Matches the Order model's enum exactly — keep in sync with models/Order.js
const ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
const PAYMENT_METHODS = ['cod', 'upi'];

// A strong-ish phone validator that accepts common Indian formats while
// staying lenient enough not to break existing users (optional field).
const phoneField = (field = 'phone') =>
  body(field)
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number');

const requiredPhoneField = (field = 'phoneNumber') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 20 })
    .withMessage('Phone number is too long')
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Please provide a valid phone number');

const emailField = (field = 'email') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .isLength({ max: 254 })
    .withMessage('Email is too long')
    .normalizeEmail();

const strongPasswordField = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password is required')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Password must contain a special character');

const nameField = (field = 'name') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters');

const roomNumberField = (field = 'roomNumber', { required = false } = {}) => {
  const chain = body(field)
    .trim()
    .isLength({ max: 20 })
    .withMessage('Room number is too long');
  return required ? chain.notEmpty().withMessage('Room number is required') : chain.optional({ checkFalsy: true });
};

const mongoIdParam = (field = 'id') =>
  param(field).isMongoId().withMessage(`Invalid ${field}`);

const mongoIdBody = (field) =>
  body(field).isMongoId().withMessage(`Invalid ${field}`);

const priceField = (field = 'price') =>
  body(field)
    .isFloat({ min: 0, max: 1000000 })
    .withMessage('Price must be a positive number');

const quantityField = (field = 'quantity', { min = 1, max = 999 } = {}) =>
  body(field)
    .isInt({ min, max })
    .withMessage(`Quantity must be between ${min} and ${max}`);

const stockField = (field = 'stock') =>
  body(field)
    .isInt({ min: 0, max: 100000 })
    .withMessage('Stock must be a non-negative whole number');

const discountField = (field = 'discount') =>
  body(field)
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100');

const imageUrlField = (field = 'image') =>
  body(field)
    .optional({ checkFalsy: true })
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Image URL is too long')
    .custom((value) => {
      // Accept absolute http(s) URLs or root-relative paths (e.g. uploaded assets).
      if (/^https?:\/\//i.test(value) || value.startsWith('/')) return true;
      throw new Error('Image must be a valid URL');
    });

const descriptionField = (field = 'description') =>
  body(field)
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description is too long');

const paginationQuery = () => [
  query('page').optional().isInt({ min: 1, max: 100000 }).withMessage('Invalid page'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
];

module.exports = {
  USER_ROLES,
  PRODUCT_CATEGORIES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  phoneField,
  requiredPhoneField,
  emailField,
  strongPasswordField,
  nameField,
  roomNumberField,
  mongoIdParam,
  mongoIdBody,
  priceField,
  quantityField,
  stockField,
  discountField,
  imageUrlField,
  descriptionField,
  paginationQuery,
};
