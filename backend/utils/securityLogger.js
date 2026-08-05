/**
 * Structured logging for security-sensitive events.
 *
 * IMPORTANT: never pass passwords, JWTs, reset tokens, or other secrets
 * into `details` — only log identifiers (user id, email, ip, route) that
 * are useful for auditing without exposing sensitive data.
 */

/**
 * Canonical security event names. Using constants instead of raw strings
 * prevents typos and makes it easy to grep the codebase for all events.
 */
const SECURITY_EVENTS = {
  // Authentication
  LOGIN_FAILED: 'login_failed',
  LOGIN_SUCCEEDED: 'login_succeeded',
  USER_REGISTERED: 'user_registered',
  EMAIL_VERIFIED: 'email_verified',
  VERIFICATION_RESENT: 'verification_email_resent',

  // Password management
  PASSWORD_CHANGE_FAILED: 'password_change_failed',
  PASSWORD_CHANGE_SUCCEEDED: 'password_change_succeeded',
  PASSWORD_RESET_REQUESTED: 'password_reset_requested',
  PASSWORD_RESET_FAILED: 'password_reset_failed',
  PASSWORD_RESET_SUCCEEDED: 'password_reset_succeeded',

  // Authorization
  AUTHORIZATION_FAILED: 'authorization_failed',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',

  // Suspicious activity
  SUSPICIOUS_REQUEST: 'suspicious_request',
  UNKNOWN_ROUTE: 'unknown_route',
  LARGE_REQUEST_BODY: 'large_request_body',
  MALFORMED_PAYLOAD: 'malformed_payload',

  // Server
  SERVER_ERROR: 'server_error',
  CORS_REJECTED: 'cors_origin_rejected',
};

const SENSITIVE_KEYS = new Set([
  'password',
  'newpassword',
  'currentpassword',
  'confirmpassword',
  'token',
  'resettoken',
  'authorization',
  'jwt',
  'secret',
]);

// Defensive scrub in case a caller accidentally includes a sensitive field.
const scrub = (details = {}) => {
  const clean = {};
  for (const [key, value] of Object.entries(details)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      clean[key] = '[redacted]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
};

const logSecurityEvent = (event, details = {}) => {
  const entry = {
    type: 'security',
    event,
    timestamp: new Date().toISOString(),
    ...scrub(details),
  };
  // Structured single-line JSON so it can be parsed by log aggregators.
  console.log(JSON.stringify(entry));
};

module.exports = { logSecurityEvent, SECURITY_EVENTS };
