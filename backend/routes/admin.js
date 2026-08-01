const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const { delByPrefix, getOrSet } = require('../utils/cache');
const {
  cleanSearchTerm,
  parsePagination,
  productProjection,
  safeUserProjection,
  shapeProducts,
} = require('../utils/query');
const {
  updateUserValidator,
  userIdParamValidator,
  createSellerValidator,
} = require('../validators/adminValidators');

// All routes are admin only
router.use(protect, authorize('admin'));

const getOrderStats = async () => {
  const { value } = await getOrSet('admin-order-stats:global', 15, async () => {
    const [
      totalOrders,
      cancelledOrders,
      pendingOrders,
      revenueAgg,
      sellerRevenueAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: { $nin: ['delivered', 'cancelled'] } }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $unwind: '$items' },
        { $match: { 'items.seller': { $exists: true, $ne: null } } },
        {
          $group: {
            _id: '$items.seller',
            revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            itemsSold: { $sum: '$items.quantity' },
          },
        },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    const sellerIds = sellerRevenueAgg.map((seller) => seller._id);
    const sellers = await User.find({ _id: { $in: sellerIds } }).select('name email').lean();
    const sellerMap = new Map(sellers.map((seller) => [seller._id.toString(), seller]));

    return {
      totalOrders,
      totalRevenue: revenueAgg[0]?.total || 0,
      cancelledOrders,
      pendingOrders,
      sellerRevenue: sellerRevenueAgg.map((seller) => ({
        sellerId: seller._id,
        name: sellerMap.get(seller._id.toString())?.name || 'Unknown',
        email: sellerMap.get(seller._id.toString())?.email || '',
        revenue: seller.revenue,
        itemsSold: seller.itemsSold,
      })),
    };
  });

  return value;
};

const invalidateAdminStats = () => {
  delByPrefix('admin-stats:');
  delByPrefix('admin-order-stats:');
};

// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', async (req, res) => {
  const { value: stats, hit } = await getOrSet('admin-stats:dashboard', 15, async () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalOrders,
      totalRevenue,
      activeUsers,
      totalProducts,
      pendingOrders,
      totalSellers,
      revenueByDay,
      ordersByStatus,
      topProducts,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ role: 'customer', isActive: true }),
      Product.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'seller' }),
      Order.aggregate([
        { $match: { status: 'delivered', createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Product.find({}, productProjection).sort({ salesCount: -1, _id: 1 }).limit(5).lean(),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      activeUsers,
      totalProducts,
      pendingOrders,
      totalSellers,
      revenueByDay,
      ordersByStatus,
      topProducts: shapeProducts(topProducts),
    };
  });

  res.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30');
  res.set('X-Cache', hit ? 'HIT' : 'MISS');
  res.json({ success: true, stats });
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', async (req, res) => {
  const { role, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const searchTerm = cleanSearchTerm(search);
  const query = {};
  if (role && role !== 'all') query.role = role;
  if (searchTerm) query.$text = { $search: searchTerm };

  const projection = searchTerm ? { ...safeUserProjection, score: { $meta: 'textScore' } } : safeUserProjection;
  const sort = searchTerm ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1, _id: -1 };

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query, projection).sort(sort).skip(skip).limit(limit).lean(),
  ]);

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), users });
});

// @route   PUT /api/admin/users/:id
// @desc    Update user (role, active status)
// @access  Admin
router.put('/users/:id', updateUserValidator, async (req, res) => {
  const { role, isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { ...(role && { role }), ...(isActive !== undefined && { isActive }) },
    { new: true, runValidators: true }
  ).select(safeUserProjection).lean();

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  invalidateAdminStats();
  res.json({ success: true, user });
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Admin
router.delete('/users/:id', userIdParamValidator, async (req, res) => {
  const user = await User.findById(req.params.id).select('role').lean();
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  if (user.role === 'admin') return res.status(400).json({ success: false, message: 'Cannot delete admin' });
  await User.deleteOne({ _id: req.params.id });
  invalidateAdminStats();
  res.json({ success: true, message: 'User deleted' });
});

// @route   POST /api/admin/sellers
// @desc    Create a seller account
// @access  Admin
router.post('/sellers', createSellerValidator, async (req, res) => {
  const { name, email, password, phone } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const existing = await User.exists({ email: normalizedEmail });
  if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });

  const seller = await User.create({ name, email: normalizedEmail, password, phone, role: 'seller' });
  invalidateAdminStats();
  res.status(201).json({ success: true, user: { id: seller._id, name: seller.name, email: seller.email, role: seller.role } });
});

// @route   GET /api/admin/orders
// @desc    Get all orders with aggregated stats
// @access  Admin
router.get('/orders', async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const query = {};
  if (status && status !== 'all') query.status = status;

  const [total, orders, stats] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    getOrderStats(),
  ]);

  res.set('Cache-Control', 'private, no-store');
  res.json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    orders,
    stats,
  });
});

// @route   GET /api/admin/products
// @desc    Get products (including unavailable)
// @access  Admin
router.get('/products', async (req, res) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
  const searchTerm = cleanSearchTerm(search);
  const query = searchTerm ? { $text: { $search: searchTerm } } : {};
  const projection = searchTerm ? { ...productProjection, score: { $meta: 'textScore' } } : productProjection;
  const sort = searchTerm ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1, _id: -1 };

  const [total, products] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query, projection)
      .populate('seller', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), products: shapeProducts(products) });
});

module.exports = router;
