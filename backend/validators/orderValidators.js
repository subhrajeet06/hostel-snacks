const { body } = require('express-validator');
const handleValidation = require('./handleValidation');
const {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  requiredPhoneField,
  roomNumberField,
  mongoIdParam,
} = require('./common');

const placeOrderValidator = [
  roomNumberField('roomNumber', { required: true }),
  requiredPhoneField('phoneNumber'),
  body('paymentMethod')
    .trim()
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(PAYMENT_METHODS)
    .withMessage(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`),
  body('upiTransactionId').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('UPI transaction ID is too long'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Notes are too long'),
  body('couponCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Coupon code is too long')
    .customSanitizer((value) => value ? value.toUpperCase() : value),
  handleValidation,
];

const validateCouponValidator = [
  body('couponCode')
    .trim()
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ max: 30 })
    .withMessage('Coupon code is too long')
    .customSanitizer((value) => value ? value.toUpperCase() : value),
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  handleValidation,
];

const updateOrderStatusValidator = [
  mongoIdParam('id'),
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .isIn(ORDER_STATUSES)
    .withMessage(`Status must be one of: ${ORDER_STATUSES.join(', ')}`),
  body('note').optional({ checkFalsy: true }).trim().isLength({ max: 500 }).withMessage('Note is too long'),
  handleValidation,
];

const orderIdParamValidator = [mongoIdParam('id'), handleValidation];

module.exports = {
  placeOrderValidator,
  updateOrderStatusValidator,
  orderIdParamValidator,
  validateCouponValidator,
};
