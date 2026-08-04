const { body } = require('express-validator');
const handleValidation = require('./handleValidation');
const {
  emailField,
  strongPasswordField,
  nameField,
  phoneField,
  roomNumberField,
} = require('./common');

// Registration enforces the full strong-password policy (Section 8).
const registerValidator = [
  nameField('name'),
  emailField('email'),
  strongPasswordField('password'),
  phoneField('phone'),
  roomNumberField('roomNumber'),
  handleValidation,
];

// Login only needs presence checks — strength is validated at
// registration/reset time, not at every login. We deliberately do NOT
// leak which part (email vs password) is wrong beyond generic validation
// messages, and the route itself returns a generic "Invalid email or
// password" for auth failures.
const loginValidator = [
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required').isLength({ max: 128 }),
  handleValidation,
];

const updateProfileValidator = [
  nameField('name'),
  phoneField('phone'),
  roomNumberField('roomNumber'),
  handleValidation,
];

const changePasswordValidator = [
  body('currentPassword').isString().notEmpty().withMessage('Current password is required').isLength({ max: 128 }),
  strongPasswordField('newPassword'),
  handleValidation,
];

const forgotPasswordValidator = [
  emailField('email'),
  handleValidation,
];

const resetPasswordValidator = [
  strongPasswordField('password'),
  handleValidation,
];

const resendVerificationValidator = [
  emailField('email'),
  handleValidation,
];

module.exports = {
  registerValidator,
  loginValidator,
  updateProfileValidator,
  changePasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  resendVerificationValidator,
};
