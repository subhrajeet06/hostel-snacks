const { logSecurityEvent } = require('../utils/securityLogger');

/**
 * Maps known error types (Mongoose validation/cast errors, JWT errors, etc.)
 * to a safe status code + message. Falls back to the error's own
 * statusCode/message when set (e.g. by our own route handlers), and to a
 * generic 500 for anything unexpected — so stack traces, DB errors, and
 * file paths are never sent to the client.
 */
const mapKnownError = (err) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(', ') || 'Validation failed';
    return { statusCode: 400, message };
  }

  // Mongoose invalid ObjectId / cast error
  if (err.name === 'CastError') {
    return { statusCode: 400, message: 'Invalid identifier supplied' };
  }

  // Mongo duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return { statusCode: 409, message: `${field} already exists` };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Token expired' };
  }

  // Body parser JSON errors
  if (err.type === 'entity.parse.failed') {
    return { statusCode: 400, message: 'Malformed JSON in request body' };
  }
  if (err.type === 'entity.too.large') {
    return { statusCode: 413, message: 'Request body too large' };
  }

  return null;
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const known = mapKnownError(err);
  const statusCode = known?.statusCode || err.statusCode || 500;
  const isServerError = statusCode >= 500;

  // Full detail (including stack trace) goes to the server logs only.
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  if (isServerError) {
    logSecurityEvent('server_error', {
      path: req.originalUrl,
      method: req.method,
      statusCode,
    });
  }

  // The client only ever gets a safe, user-friendly message — never the
  // raw error, stack trace, or internal details.
  const message = known?.message
    || (isServerError ? 'Something went wrong. Please try again later.' : err.message)
    || 'Something went wrong. Please try again later.';

  res.status(statusCode).json({ success: false, message });
};

// eslint-disable-next-line no-unused-vars
const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
};

module.exports = { errorHandler, notFoundHandler };
