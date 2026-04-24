const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/orders
// @desc    Place an order
// @access  Customer
router.post('/', protect, authorize('customer'), async (req, res) => {
  const { roomNumber, phoneNumber, paymentMethod, upiTransactionId, notes, couponCode } = req.body;

  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product');
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, message: 'Cart is empty' });
  }

  // Verify stock and build order items
  const orderItems = [];
  let totalAmount = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.product._id);
    if (!product || !product.isAvailable) {
      return res.status(400).json({ success: false, message: `${item.product.name} is no longer available` });
    }
    if (product.stock < item.quantity) {
      return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
    }

    const price = product.price - (product.price * product.discount) / 100;
    orderItems.push({ product: product._id, name: product.name, image: product.image, price, quantity: item.quantity });
    totalAmount += price * item.quantity;

    // Deduct stock
    product.stock -= item.quantity;
    product.salesCount += item.quantity;
    await product.save();
  }

  // Apply coupon discount (basic implementation)
  let discount = 0;
  if (couponCode === 'HOSTEL10') discount = totalAmount * 0.1;
  if (couponCode === 'FIRST20') discount = totalAmount * 0.2;
  totalAmount = Math.max(0, totalAmount - discount);

  const order = await Order.create({
    user: req.user.id,
    items: orderItems,
    totalAmount,
    roomNumber,
    phoneNumber,
    paymentMethod,
    upiTransactionId: upiTransactionId || '',
    notes: notes || '',
    discount,
    couponCode: couponCode || '',
    paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    statusHistory: [{ status: 'pending', note: 'Order placed' }],
  });

  // Clear cart after order
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });

  // Emit socket event to sellers
  const io = req.app.get('io');
  if (io) io.to('sellers').emit('new_order', { orderId: order._id, totalAmount: order.totalAmount });

  await order.populate('user', 'name email');
  res.status(201).json({ success: true, order });
});

// @route   GET /api/orders/my
// @desc    Get customer's orders
// @access  Customer
router.get('/my', protect, authorize('customer'), async (req, res) => {
  const orders = await Order.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Customer (own) / Seller / Admin
router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email phone');
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  if (req.user.role === 'customer' && order.user._id.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  res.json({ success: true, order });
});

// @route   GET /api/orders/seller/all
// @desc    Get all orders (for seller)
// @access  Seller / Admin
router.get('/seller/all', protect, authorize('seller', 'admin'), async (req, res) => {
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

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Seller / Admin
router.put('/:id/status', protect, authorize('seller', 'admin'), async (req, res) => {
  const { status, note } = req.body;
  const validStatuses = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  order.status = status;
  order.statusHistory.push({ status, note: note || '' });
  if (status === 'delivered') order.paymentStatus = 'paid';
  await order.save();

  // Emit real-time update to customer
  const io = req.app.get('io');
  if (io) {
    io.to(`user_${order.user}`).emit('order_status_update', {
      orderId: order._id,
      status,
      note,
    });
  }

  res.json({ success: true, order });
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order (customer)
// @access  Customer
router.put('/:id/cancel', protect, authorize('customer'), async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user.toString() !== req.user.id) return res.status(403).json({ success: false, message: 'Not authorized' });
  if (['delivered', 'cancelled', 'out_for_delivery'].includes(order.status)) {
    return res.status(400).json({ success: false, message: 'Order cannot be cancelled at this stage' });
  }

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.quantity, salesCount: -item.quantity },
    });
  }

  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer' });
  await order.save();

  res.json({ success: true, order });
});

module.exports = router;
