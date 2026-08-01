/**
 * Structured logging for security-sensitive events.
 *
 * IMPORTANT: never pass passwords, JWTs, reset tokens, or other secrets
 * into `details` — only log identifiers (user id, email, ip, route) that
 * are useful for auditing without exposing sensitive data.
 */

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

module.exports = { logSecurityEvent };
