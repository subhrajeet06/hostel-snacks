const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Strict mode rejects unknown query fields — defense-in-depth against
    // accidental unfiltered input reaching Mongo.
    mongoose.set('strictQuery', true);

    // Suppress Mongoose debug logging in production to avoid leaking
    // query details into stdout. Useful during development to see what
    // queries are actually being sent.
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', !!process.env.MONGOOSE_DEBUG);
    }

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
      minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // ─── Connection event monitoring ──────────────────────────────────────
    // These events fire on the primary connection and are essential for
    // production health monitoring — Render logs will capture them.
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
