const mongoose = require('mongoose');

/**
 * Immutable audit log for admin/seller mutations.
 *
 * Entries are insert-only — no update or delete operations should ever be
 * performed on this collection to preserve a tamper-evident trail.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'product_created',
        'product_updated',
        'product_deleted',
        'user_updated',
        'user_deleted',
        'role_changed',
        'seller_created',
        'order_status_changed',
        'inventory_updated',
        'price_updated',
      ],
    },
    resourceType: {
      type: String,
      required: true,
      enum: ['product', 'user', 'order', 'coupon'],
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success',
    },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: 'timestamp', updatedAt: false },
  }
);

// Fast lookup by resource, actor, and chronological browsing.
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
