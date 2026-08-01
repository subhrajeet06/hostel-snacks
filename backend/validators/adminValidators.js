const { body } = require('express-validator');
const handleValidation = require('./handleValidation');
const {
  USER_ROLES,
  mongoIdParam,
  emailField,
  strongPasswordField,
  nameField,
  phoneField,
} = require('./common');

const updateUserValidator = [
  mongoIdParam('id'),
  body('role').optional().isIn(USER_ROLES).withMessage(`Role must be one of: ${USER_ROLES.join(', ')}`),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidation,
];

const userIdParamValidator = [mongoIdParam('id'), handleValidation];

const createSellerValidator = [
  nameField('name'),
  emailField('email'),
  strongPasswordField('password'),
  phoneField('phone'),
  handleValidation,
];

module.exports = {
  updateUserValidator,
  userIdParamValidator,
  createSellerValidator,
};
