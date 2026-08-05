const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { protect, authorize } = require('../middleware/auth');
const { delByPrefix } = require('../utils/cache');
const { discountedPrice, parsePagination } = require('../utils/query');
const {
  placeOrderValidator,
  updateOrderStatusValidator,
  orderIdParamValidator,
  validateCouponValidator,
} = require('../validators/orderValidators');
const { logAudit } = require('../utils/auditLogger');

const ORDER_LIST_LIMIT = 50;

const invalidateOrderCaches = () => {
  delByPrefix('admin-stats:');
  delByPrefix('admin-order-stats:');
  delByPrefix('products:');
  delByPrefix('products-home:');
};

/**
 * Validates a coupon code and returns the discount amount.
 * Does NOT redeem the coupon — use redeemCoupon after the order is created.
 */
const validateCoupon = async (couponCode, userId, totalAmount) => {
  if (!couponCode) return { discount: 0, coupon: null };

  const code = String(couponCode).trim().toUpperCase();
  const coupon = await Coupon.findOne({ code, isActive: true });

  if (!coupon) {
    return { error: 'Invalid coupon code' };
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { error: 'This coupon has expired' };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { error: 'This coupon has reached its maximum usage limit' };
  }

  // Check per-user limit
  const userUseCount = coupon.usedBy.filter(
    (entry) => entry.user.toString() === userId
  ).length;
  if (userUseCount >= coupon.perUserLimit) {
    return { error: 'You have already used this coupon the maximum number of times' };
  }

  const discount = totalAmount * (coupon.discountPercent / 100);
  return { discount, coupon, discountPercent: coupon.discountPercent };
};

/**
 * Atomically redeem a coupon — increment usedCount and push to usedBy.
 * Uses conditions in the filter to prevent race-condition double-redemption.
 */
const redeemCoupon = async (couponId, userId) => {
  await Coupon.findByIdAndUpdate(couponId, {
    $inc: { usedCount: 1 },
    $push: { usedBy: { user: userId, usedAt: new Date() } },
  });
};

const sellerOrderView = (order, sellerId) => {
  const items = (order.items || []).filter((item) => item.seller && item.seller.toString() === sellerId);
  const rawOrderTotal = (order.items || []).reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const sellerRawTotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  const orderDiscount = order.discount || 0;
  const sellerDiscount = rawOrderTotal > 0 ? (sellerRawTotal / rawOrderTotal) * orderDiscount : 0;
  const sellerAmount = Math.max(0, sellerRawTotal - sellerDiscount);

  return {
    ...order,
    items,
    sellerSubtotal: Math.round(sellerRawTotal * 100) / 100,
    sellerDiscount: Math.round(sellerDiscount * 100) / 100,
    sellerAmount: Math.round(sellerAmount * 100) / 100,
  };
};

// @route   POST /api/orders/validate-coupon
// @desc    Validate a coupon without placing an order
// @access  Customer
router.post('/validate-coupon', protect, authorize('customer'), validateCouponValidator, async (req, res) => {
  const { couponCode, totalAmount } = req.body;
  const result = await validateCoupon(couponCode, req.user.id, totalAmount || 0);

  if (result.error) {
    return res.status(400).json({ success: false, message: result.error });
  }

  res.json({
    success: true,
    discountPercent: result.discountPercent,
    message: `Coupon applied — ${result.discountPercent}% off!`,
  });
});

// @route   POST /api/orders
// @desc    Place an order
// @access  Customer
router.post('/', protect, authorize('customer'), placeOrderValidator, async (req, res) => {
  const { roomNumber, phoneNumber, paymentMethod, upiTransactionId, notes, couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user.id }).select('items').lean();
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  const productIds = cart.items.map((item) => item.product);
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name image price discount stock isAvailable seller')
    .lean();

  const productMap = new Map(products.map((product) => [product._id.toString(), product]));
  const orderItems = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    const product = productMap.get(item.product.toString());
    if (!product || !product.isAvailable) {
      return res.status(400).json({ success: false, message: 'One or more products are no longer available' });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
    }

    const price = discountedPrice(product);
    orderItems.push({
      product: product._id,
      seller: product.seller,
      name: product.name,
      image: product.image,
      price,
      quantity: item.quantity,
    });
    totalAmount += price * item.quantity;
  }

  // Validate coupon via DB
  let discount = 0;
  let validatedCoupon = null;
  if (couponCode) {
    const couponResult = await validateCoupon(couponCode, req.user.id, totalAmount);
    if (couponResult.error) {
      return res.status(400).json({ success: false, message: couponResult.error });
    }
    discount = couponResult.discount;
    validatedCoupon = couponResult.coupon;
  }

  const finalAmount = Math.max(0, totalAmount - discount);

  const stockOps = orderItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product, isAvailable: true, stock: { $gte: item.quantity } },
      update: { $inc: { stock: -item.quantity, salesCount: item.quantity } },
    },
  }));

  const stockResult = await Product.bulkWrite(stockOps, { ordered: true });
  if (stockResult.modifiedCount !== stockOps.length) {
    return res.status(409).json({ success: false, message: 'Stock changed while placing order. Please review your cart.' });
  }

  // Redeem coupon atomically after stock is confirmed
  if (validatedCoupon) {
    await redeemCoupon(validatedCoupon._id, req.user.id);
  }

  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    totalAmount: finalAmount,
    roomNumber,
    phoneNumber,
    paymentMethod,
    upiTransactionId: upiTransactionId || '',
    notes: notes || '',
    discount,
    couponCode: couponCode ? String(couponCode).trim().toUpperCase() : '',
    paymentStatus: 'pending',
    statusHistory: [{ status: 'pending', note: 'Order placed' }],
  });

  await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
  invalidateOrderCaches();

  const io = req.app.get('io');
  if (io) io.to('sellers').emit('new_order', { orderId: order._id, totalAmount: order.totalAmount });

  const responseOrder = await Order.findById(order._id)
    .populate('user', 'name email')
    .lean();

  res.status(201).json({ success: true, order: responseOrder });
});

// @route   GET /api/orders/my
// @desc    Get customer's orders
// @access  Customer
router.get('/my', protect, authorize('customer'), async (req, res) => {
  const orders = await Order.find({ user: req.user.id })
    .select('items totalAmount roomNumber phoneNumber paymentMethod paymentStatus status statusHistory discount couponCode notes createdAt updatedAt')
    .sort({ createdAt: -1, _id: -1 })
    .limit(ORDER_LIST_LIMIT)
    .lean();

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, orders });
});

// @route   GET /api/orders/seller/all
// @desc    Get orders for seller (only their items) or all orders for admin
// @access  Seller / Admin
router.get('/seller/all', protect, authorize('seller', 'admin'), async (req, res) => {
  const { status } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  const isAdmin = req.user.role === 'admin';

  const query = {};
  if (status) query.status = status;
  if (!isAdmin) query['items.seller'] = req.user.id;

  const [total, rawOrders] = await Promise.all([
    Order.countDocuments(query),
    Order.find(query)
      .populate('user', 'name email phone')
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const orders = isAdmin ? rawOrders : rawOrders.map((order) => sellerOrderView(order, req.user.id));

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, total, page, pages: Math.ceil(total / limit), orders });
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Customer (own) / Seller / Admin
router.get('/:id', protect, orderIdParamValidator, async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('user', 'name email phone')
    .lean();

  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (req.user.role === 'customer' && order.user._id.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }
  if (req.user.role === 'seller' && !order.items.some((item) => item.seller?.toString() === req.user.id)) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, order: req.user.role === 'seller' ? sellerOrderView(order, req.user.id) : order });
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Seller / Admin
router.put('/:id/status', protect, authorize('seller', 'admin'), updateOrderStatusValidator, async (req, res) => {
  const { status, note } = req.body;

  const query = { _id: req.params.id };
  if (req.user.role === 'seller') query['items.seller'] = req.user.id;

  const update = {
    $set: {
      status,
      ...(status === 'delivered' ? { paymentStatus: 'paid' } : {}),
    },
    $push: { statusHistory: { status, note: note || '' } },
  };

  const order = await Order.findOneAndUpdate(query, update, { new: true, runValidators: true }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  logAudit(req, {
    action: 'order_status_changed',
    resourceType: 'order',
    resourceId: req.params.id,
    changes: { status: { from: order.statusHistory?.[order.statusHistory.length - 2]?.status || 'unknown', to: status } },
  });

  invalidateOrderCaches();

  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.user}`).emit('order_status_update', {
      orderId: order._id,
      status,
      note,
    });
  }

  res.json({ success: true, order: req.user.role === 'seller' ? sellerOrderView(order, req.user.id) : order });
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (customer)
// @access  Customer
router.put('/:id/cancel', protect, authorize('customer'), orderIdParamValidator, async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user.id }).lean();
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (['delivered', 'cancelled', 'out_for_delivery'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
  }

  const restoreOps = order.items.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { stock: item.quantity, salesCount: -item.quantity } },
    },
  }));

  if (restoreOps.length) await Product.bulkWrite(restoreOps, { ordered: false });

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    {
      $set: { status: 'cancelled' },
      $push: { statusHistory: { status: 'cancelled', note: 'Cancelled by customer' } },
    },
    { new: true, runValidators: true }
  ).lean();

  invalidateOrderCaches();
  res.json({ success: true, order: updatedOrder });
});

module.exports = router;
