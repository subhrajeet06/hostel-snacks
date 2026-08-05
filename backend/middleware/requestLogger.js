/**
 * Structured HTTP request logger.
 *
 * Logs every API request on `res.finish` as a single-line JSON object
 * compatible with log aggregators (Render, Datadog, etc.).
 *
 * NEVER logs passwords, JWTs, or secrets. The authenticated user ID is
 * included when available so ops can correlate requests to accounts.
 */

const SKIP_PATHS = new Set(['/api/health']);

const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    // Skip noisy health checks
    if (SKIP_PATHS.has(req.originalUrl)) return;

    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

    const entry = {
      type: 'request',
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      responseTimeMs: Math.round(elapsedMs * 10) / 10,
      ip: req.ip || '',
      userId: req.user?.id || null,
      userAgent: (req.headers['user-agent'] || '').slice(0, 256),
      timestamp: new Date().toISOString(),
    };

    // Use warn for server errors so they stand out in log streams.
    if (res.statusCode >= 500) {
      console.warn(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  });

  next();
};

module.exports = { requestLogger };
