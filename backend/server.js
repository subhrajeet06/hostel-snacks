require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');
const { apiLimiter } = require('./middleware/rateLimiter');
const { mongoInjectionGuard, xssGuard } = require('./middleware/sanitize');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { logSecurityEvent } = require('./utils/securityLogger');
const { requestTimer, responseCompression } = require('./middleware/performance');
const { requestLogger } = require('./middleware/requestLogger');

// ─── Boot-time environment validation ──────────────────────────────────────
// A weak or missing JWT secret undermines every other security control in
// the app (auth, authorization, sockets), so we fail fast instead of
// starting with an insecure configuration.
const MIN_JWT_SECRET_LENGTH = 32;
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < MIN_JWT_SECRET_LENGTH) {
  console.error(
    `❌ JWT_SECRET is missing or too weak. Set a JWT_SECRET of at least ${MIN_JWT_SECRET_LENGTH} characters in your environment.`
  );
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not set.');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Parse allowed origins (supports comma-separated FRONTEND_URL for multiple domains)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Shared origin-check used by both the HTTP CORS middleware and Socket.io.
// Requests with no Origin header (server-to-server, curl, health checks)
// are allowed through; anything with an Origin header must match the
// configured allow-list exactly.
const isOriginAllowed = (origin) => !origin || allowedOrigins.includes(origin);

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) return callback(null, true);
    logSecurityEvent('suspicious_request', { reason: 'cors_origin_rejected', origin });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Make io available to routes
app.set('io', io);

// Connect Database
connectDB();

app.use(requestTimer);
app.use(requestLogger);

// Security headers. This is a JSON API (not a page renderer), so a
// restrictive CSP does not affect the React frontend (served by Vercel).
// crossOriginResourcePolicy is 'cross-origin' so the frontend can fetch.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: process.env.NODE_ENV === 'production'
      ? { maxAge: 31536000, includeSubDomains: true }
      : false,
  })
);

app.use(cors(corsOptions));
// Ensure preflight requests are answered with the same CORS rules everywhere.
app.options('*', cors(corsOptions));

app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_LIMIT || '1mb' }));

// Sanitize against NoSQL operator injection and strip HTML/script content
// from all incoming string input before it ever reaches a controller.
app.use(mongoInjectionGuard);
app.use(xssGuard);

app.use(responseCompression);

// General API rate limit — applied globally, ahead of route-specific limiters.
app.use('/api', apiLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
// Auth sub-routes get their own stricter, endpoint-specific limiters
// (see routes/auth.js) in addition to the global /api limiter above.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, message: '🍟 Hostel Snacks API is running!' });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role isActive').lean();
    if (!user || !user.isActive) return next(new Error('Unauthorized'));

    socket.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  const { id, role } = socket.user;

  socket.join(`user_${id}`);
  if (role === 'seller' || role === 'admin') {
    socket.join('sellers');
  }

  console.log(`🔌 Socket connected: ${socket.id} (${role}:${id})`);

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global Error Handler ──────────────────────────────────────────────────────
// Must be registered last. Never leaks stack traces, DB errors, or internal
// details to the client — see middleware/errorHandler.js.
app.use(errorHandler);

// ─── Production hardening ─────────────────────────────────────────────────────
// Render (and most ALBs) use a 60 s idle timeout; keepAliveTimeout must be
// greater to prevent 502s caused by the ALB sending a request on a connection
// that Node already closed.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.setTimeout(Number(process.env.SERVER_TIMEOUT_MS || 30_000));

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
