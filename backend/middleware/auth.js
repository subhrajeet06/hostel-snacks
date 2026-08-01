const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { safeUserProjection } = require('../utils/query');
const { logSecurityEvent } = require('../utils/securityLogger');

// Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select(safeUserProjection).lean();
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    req.user = { ...user, id: user._id.toString() };
    next();
  } catch (error) {
    // jwt.verify throws TokenExpiredError / JsonWebTokenError / NotBeforeError.
    // We intentionally return the same generic message for all of them to
    // avoid leaking implementation details, while logging the specific
    // reason server-side for auditing.
    logSecurityEvent('authorization_failed', {
      reason: error.name || 'invalid_token',
      path: req.originalUrl,
      ip: req.ip,
    });
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logSecurityEvent('authorization_failed', {
        reason: 'insufficient_role',
        userId: req.user.id,
        path: req.originalUrl,
      });
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this route',
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
