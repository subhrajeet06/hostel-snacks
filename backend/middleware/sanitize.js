const mongoSanitize = require('express-mongo-sanitize');

/**
 * Strips MongoDB operator keys ($ne, $gt, $where, $regex, etc.) and dotted
 * keys from req.body / req.params / req.query so user input can never be
 * interpreted as a query operator (NoSQL injection).
 *
 * Replaces offending characters instead of deleting the whole key, and
 * logs when a request actually contained an operator injection attempt.
 */
const mongoInjectionGuard = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    // Lazy require to avoid a circular dependency at module load time.
    const { logSecurityEvent } = require('../utils/securityLogger');
    logSecurityEvent('suspicious_request', {
      reason: 'nosql_operator_stripped',
      field: key,
      ip: req.ip,
      path: req.originalUrl,
    });
  },
});

// Very small, dependency-free HTML/script stripper used as defense-in-depth
// alongside mongoSanitize. It removes tags entirely rather than trying to
// "clean" them, since these fields (names, notes, search terms, etc.) never
// need to contain markup.
const stripHtml = (value) => value.replace(/<\/?[a-zA-Z!][^>]*>/g, '').trim();

const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return stripHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = sanitizeValue(val);
    }
    return result;
  }
  return value;
};

/**
 * Recursively strips HTML/script tags from string values in body/params/query.
 * Runs after mongoInjectionGuard. Only touches string content — it does not
 * change types, so numeric/boolean validation downstream is unaffected.
 */
const xssGuard = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
  if (req.params && typeof req.params === 'object') req.params = sanitizeValue(req.params);
  // req.query is a getter-only property on some Express/Node versions;
  // mutate its keys in place rather than reassigning the object itself.
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeValue(req.query);
    for (const key of Object.keys(req.query)) delete req.query[key];
    Object.assign(req.query, sanitizedQuery);
  }
  next();
};

module.exports = { mongoInjectionGuard, xssGuard };
