const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { delByPrefix } = require('../utils/cache');
const { discountedPrice, parsePagination } = require('../utils/query');
const {
  placeOrderValidator,
  updateOrderStatusValidator,
  orderIdParamValidator,
} = require('../validators/orderValidators');

const ORDER_LIST_LIMIT = 50;

const invalidateOrderCaches = () => {
  delByPrefix('admin-stats:');
  delByPrefix('admin-order-stats:');
  delByPrefix('products:');
  delByPrefix('products-home:');
};

const applyCoupon = (totalAmount, couponCode) => {
  if (couponCode === 'HOSTEL10') return totalAmount * 0.1;
  if (couponCode === 'FIRST20') return totalAmount * 0.2;
  return 0;
};

const sellerOrderView = (order, sellerId) => {
  const items = order.items.filter((item) => item.seller && item.seller.toString() === sellerId);
  return {
    ...order,
    items,
    sellerAmount: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
};

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

  const discount = applyCoupon(totalAmount, couponCode);
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
    couponCode: couponCode || '',
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
