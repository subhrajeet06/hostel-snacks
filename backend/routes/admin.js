const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');

// All routes are admin only
router.use(protect, authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', async (req, res) => {
  const totalOrders = await Order.countDocuments();
  const totalRevenue = await Order.aggregate([
    { $match: { status: 'delivered' } },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } },
  ]);
  const activeUsers = await User.countDocuments({ role: 'customer', isActive: true });
  const totalProducts = await Product.countDocuments();
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const totalSellers = await User.countDocuments({ role: 'seller' });

  // Revenue by day (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const revenueByDay = await Order.aggregate([
    { $match: { status: 'delivered', createdAt: { $gte: sevenDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalAmount' },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Orders by status
  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  // Top products
  const topProducts = await Product.find().sort({ salesCount: -1 }).limit(5);

  res.json({
    success: true,
    stats: {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      activeUsers,
      totalProducts,
      pendingOrders,
      totalSellers,
      revenueByDay,
      ordersByStatus,
      topProducts,
    },
  });
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (page - 1) * limit;
  const total = await User.countDocuments(query);
  const users = await User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit));

  res.json({ success: true, total, users });
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (role, active status)
// @access  Admin
router.put('/users/:id', async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
    { new: true }
  ).select('-password');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin' });
  await user.deleteOne();
  res.json({ success: true, message: 'User deleted' });
});

// @route   POST /api/admin/sellers
// @desc    Create a seller account
// @access  Admin
router.post('/sellers', async (req, res) => {
  const { name, email, password, phone } = req.body;
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

  const seller = await User.create({ name, email, password, phone, role: 'seller' });
  res.status(201).json({ success: true, user: { id: seller._id, name: seller.name, email: seller.email, role: seller.role } });
});

// @route   GET /api/admin/orders
// @desc    Get all orders
// @access  Admin
router.get('/orders', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;

  const skip = (page - 1) * limit;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate('user', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({ success: true, total, orders });
});

// @route   GET /api/admin/products
// @desc    Get all products (including unavailable)
// @access  Admin
router.get('/products', async (req, res) => {
  const products = await Product.find().populate('seller', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, products });
});

module.exports = router;
