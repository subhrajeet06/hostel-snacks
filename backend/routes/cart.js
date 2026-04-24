const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Customer
router.get('/', protect, authorize('customer'), async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id }).populate('items.product', 'name price image isAvailable stock discount');
  if (!cart) return res.json({ success: true, cart: { items: [], totalAmount: 0, totalItems: 0 } });
  res.json({ success: true, cart });
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Customer
router.post('/add', protect, authorize('customer'), async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  if (!product.isAvailable) return res.status(400).json({ success: false, message: 'Product is not available' });
  if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

  const price = product.price - (product.price * product.discount) / 100;

  let cart = await Cart.findOne({ user: req.user.id });

  if (!cart) {
    cart = await Cart.create({
      user: req.user.id,
      items: [{ product: productId, quantity, price }],
    });
  } else {
    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) return res.status(400).json({ success: false, message: 'Insufficient stock' });
      existingItem.quantity = newQty;
      existingItem.price = price;
    } else {
      cart.items.push({ product: productId, quantity, price });
    }
    await cart.save();
  }

  await cart.populate('items.product', 'name price image isAvailable stock discount');
  res.json({ success: true, cart });
});

// @route   PUT /api/cart/update
// @desc    Update item quantity in cart
// @access  Customer
router.put('/update', protect, authorize('customer'), async (req, res) => {
  const { productId, quantity } = req.body;

  if (quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });

  const product = await Product.findById(productId);
  if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });

  item.quantity = quantity;
  await cart.save();
  await cart.populate('items.product', 'name price image isAvailable stock discount');

  res.json({ success: true, cart });
});

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
// @access  Customer
router.delete('/remove/:productId', protect, authorize('customer'), async (req, res) => {
  const cart = await Cart.findOne({ user: req.user.id });
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  cart.items = cart.items.filter((item) => item.product.toString() !== req.params.productId);
  await cart.save();
  await cart.populate('items.product', 'name price image isAvailable stock discount');

  res.json({ success: true, cart });
});

// @route   DELETE /api/cart/clear
// @desc    Clear cart
// @access  Customer
router.delete('/clear', protect, authorize('customer'), async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
});

module.exports = router;
