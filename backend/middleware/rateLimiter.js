const rateLimit = require('express-rate-limit');

// Structured security event logger (see utils/securityLogger.js)
const { logSecurityEvent } = require('../utils/securityLogger');

/**
 * Shared JSON handler for exceeded rate limits.
 * Keeps error responses consistent (never HTML) and logs the violation
 * without leaking any sensitive request data.
 */
const jsonRateLimitHandler = (keyPrefix) => (req, res /*, next, options */) => {
  logSecurityEvent('rate_limit_exceeded', {
    scope: keyPrefix,
    ip: req.ip,
    path: req.originalUrl,
    method: req.method,
  });

  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  });
};

/**
 * Factory that builds an express-rate-limit middleware.
 *
 * Signature is intentionally kept compatible with the previous in-memory
 * implementation (`{ windowMs, max, keyPrefix }`) so existing call sites
 * do not need to change.
 *
 * windowMs/max can be overridden per-instance, but every limiter also
 * supports being tuned globally via environment variables through the
 * named exports below (loginLimiter, forgotPasswordLimiter, etc.).
 */
const createRateLimiter = ({ windowMs, max, keyPrefix }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // adds RateLimit-* headers
    legacyHeaders: false,
    // Rate limit is per-IP by default (req.ip), which is what we want here.
    // `trust proxy` is configured in server.js so req.ip reflects the real client.
    handler: jsonRateLimitHandler(keyPrefix),
    skipSuccessfulRequests: false,
  });

// ─── General API limiter ───────────────────────────────────────────────────
// Applied globally to all /api routes.
const apiLimiter = createRateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  keyPrefix: 'api',
});

// ─── Auth limiters (stricter, brute-force protection) ──────────────────────
const loginLimiter = createRateLimiter({
  windowMs: Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 5),
  keyPrefix: 'login',
});

const registerLimiter = createRateLimiter({
  windowMs: Number(process.env.REGISTER_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.REGISTER_RATE_LIMIT_MAX || 10),
  keyPrefix: 'register',
});

const forgotPasswordLimiter = createRateLimiter({
  windowMs: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX || 5),
  keyPrefix: 'forgot-password',
});

const resetPasswordLimiter = createRateLimiter({
  windowMs: Number(process.env.RESET_PASSWORD_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RESET_PASSWORD_RATE_LIMIT_MAX || 5),
  keyPrefix: 'reset-password',
});

const resendVerificationLimiter = createRateLimiter({
  windowMs: Number(process.env.RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RESEND_VERIFICATION_RATE_LIMIT_MAX || 5),
  keyPrefix: 'resend-verification',
});

// Kept as the default export for backward compatibility with any code that
// does `const createRateLimiter = require('./middleware/rateLimiter')`.
module.exports = createRateLimiter;
module.exports.createRateLimiter = createRateLimiter;
module.exports.apiLimiter = apiLimiter;
module.exports.loginLimiter = loginLimiter;
module.exports.registerLimiter = registerLimiter;
module.exports.forgotPasswordLimiter = forgotPasswordLimiter;
module.exports.resetPasswordLimiter = resetPasswordLimiter;
module.exports.resendVerificationLimiter = resendVerificationLimiter;
