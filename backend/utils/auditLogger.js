const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit log entry. Fire-and-forget — failures are
 * logged to stderr but never block the HTTP response.
 *
 * @param {import('express').Request} req - Express request (for actor, IP, UA).
 * @param {Object} opts
 * @param {string} opts.action       - One of the AuditLog action enum values.
 * @param {string} opts.resourceType - 'product' | 'user' | 'order' | 'coupon'.
 * @param {string} opts.resourceId   - The _id of the affected resource.
 * @param {string} [opts.status]     - 'success' (default) | 'failure'.
 * @param {Object} [opts.changes]    - Diff object { field: { from, to } }.
 */
const logAudit = (req, { action, resourceType, resourceId, status = 'success', changes = null }) => {
  AuditLog.create({
    actor: req.user?.id || req.user?._id,
    action,
    resourceType,
    resourceId,
    ip: req.ip || '',
    userAgent: (req.headers?.['user-agent'] || '').slice(0, 512),
    status,
    changes,
  }).catch((err) => {
    console.error('[audit-log] Failed to write audit entry:', err.message);
  });
};

/**
 * Computes a { field: { from, to } } diff between two plain objects.
 * Only includes fields that actually changed.
 *
 * @param {Object} before - Original values.
 * @param {Object} after  - New values.
 * @param {string[]} fields - Fields to compare.
 * @returns {Object|null} Diff object, or null if nothing changed.
 */
const diffChanges = (before, after, fields) => {
  const diff = {};
  for (const field of fields) {
    const oldVal = before?.[field];
    const newVal = after?.[field];
    if (String(oldVal) !== String(newVal)) {
      diff[field] = { from: oldVal, to: newVal };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
};

module.exports = { logAudit, diffChanges };
