require('dotenv').config();

const connectDB = require('../config/db');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

const run = async () => {
  await connectDB();

  await Promise.all([
    User.syncIndexes(),
    Product.syncIndexes(),
    Cart.syncIndexes(),
    Order.syncIndexes(),
  ]);

  console.log('MongoDB indexes synced successfully');
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
