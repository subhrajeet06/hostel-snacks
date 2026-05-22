require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/User');
const createRateLimiter = require('./middleware/rateLimiter');
const { requestTimer, responseCompression } = require('./middleware/performance');

const app = express();
const server = http.createServer(app);
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Parse allowed origins (supports comma-separated FRONTEND_URL for multiple domains)
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

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
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: process.env.JSON_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.FORM_LIMIT || '1mb' }));
app.use(responseCompression);

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT || 40),
  keyPrefix: 'auth',
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, require('./routes/auth'));
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

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});
