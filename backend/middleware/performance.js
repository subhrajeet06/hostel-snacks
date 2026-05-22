const zlib = require('zlib');

const COMPRESSIBLE_TYPES = /json|text|javascript|css|svg|xml/i;
const MIN_COMPRESS_BYTES = 1024;

const requestTimer = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const originalWriteHead = res.writeHead;

  res.writeHead = function writeHeadWithTiming(...args) {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${elapsedMs.toFixed(1)}ms`);
    }
    return originalWriteHead.apply(this, args);
  };

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const slowMs = Number(process.env.SLOW_REQUEST_MS || 750);
    if (elapsedMs >= slowMs) {
      console.warn(`[slow-api] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs.toFixed(1)}ms`);
    }
  });

  next();
};

const responseCompression = (req, res, next) => {
  if (req.method === 'HEAD') return next();

  const originalSend = res.send.bind(res);

  res.send = function sendCompressed(body) {
    if (!body || res.statusCode === 204 || res.statusCode === 304) {
      return originalSend(body);
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const contentType = String(res.getHeader('Content-Type') || '');
    if (!COMPRESSIBLE_TYPES.test(contentType)) return originalSend(body);

    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
    if (buffer.length < MIN_COMPRESS_BYTES) return originalSend(body);

    const encoding = acceptEncoding.includes('br')
      ? 'br'
      : acceptEncoding.includes('gzip')
        ? 'gzip'
        : null;

    if (!encoding) return originalSend(body);

    const compress = encoding === 'br' ? zlib.brotliCompress : zlib.gzip;
    compress(buffer, (error, compressed) => {
      if (error) return originalSend(body);

      res.removeHeader('Content-Length');
      res.setHeader('Content-Encoding', encoding);
      res.setHeader('Vary', 'Accept-Encoding');
      res.end(compressed);
    });

    return res;
  };

  next();
};

module.exports = {
  requestTimer,
  responseCompression,
};
