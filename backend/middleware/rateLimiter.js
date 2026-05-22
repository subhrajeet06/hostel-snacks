const buckets = new Map();

const createRateLimiter = ({ windowMs, max, keyPrefix }) => (req, res, next) => {
  const identifier = req.ip || req.socket?.remoteAddress || 'unknown';
  const key = `${keyPrefix}:${identifier}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', max - 1);
    return next();
  }

  bucket.count += 1;
  const remaining = Math.max(0, max - bucket.count);
  res.setHeader('RateLimit-Limit', max);
  res.setHeader('RateLimit-Remaining', remaining);
  res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

  if (bucket.count > max) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
    });
  }

  next();
};

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60 * 1000).unref();

module.exports = createRateLimiter;
