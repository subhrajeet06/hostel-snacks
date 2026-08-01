const { validationResult } = require('express-validator');

/**
 * Runs after an express-validator chain. Returns a consistent JSON shape
 * for validation errors instead of the express-validator default.
 *
 * Response shape:
 * {
 *   success: false,
 *   message: "Validation failed",
 *   errors: [{ field: "email", message: "..." }, ...]
 * }
 */
const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};

module.exports = handleValidation;
