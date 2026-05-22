const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { discountedPrice } = require('../utils/query');

const CART_PRODUCT_FIELDS = 'name price image isAvailable stock discount';
const emptyCart = { items: [], totalAmount: 0, totalItems: 0 };

const parseQuantity = (value, fallback = 1) => {
  const quantity = Number.parseInt(value, 10);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : fallback;
};

const shapeCart = (cart) => {
  if (!cart) return emptyCart;

  const items = (cart.items || []).map((item) => ({
    _id: item._id,
    product: item.product,
    quantity: item.quantity,
    price: item.price,
  }));

  return {
    _id: cart._id,
    user: cart.user,
    items,
    totalAmount: items.reduce((total, item) => total + item.price * item.quantity, 0),
    totalItems: items.reduce((total, item) => total + item.quantity, 0),
    updatedAt: cart.updatedAt,
  };
};

const hydrateCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate('items.product', CART_PRODUCT_FIELDS)
    .lean();
  return shapeCart(cart);
};

const getAvailableProduct = async (productId, quantity) => Product.findOne({
  _id: productId,
  isAvailable: true,
  stock: { $gte: quantity },
}).select('price discount stock').lean();

// @route   GET /api/cart
// @desc    Get user's cart
// @access  Customer
router.get('/', protect, authorize('customer'), async (req, res) => {
  let cart = await Cart.findOne({ user: req.user.id })
    .populate('items.product', CART_PRODUCT_FIELDS)
    .lean();

  if (!cart) return res.json({ success: true, cart: emptyCart });

  let changed = false;
  const validItems = [];

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isAvailable || product.stock < 1) {
      changed = true;
      continue;
    }

    const quantity = Math.min(item.quantity, product.stock);
    const price = discountedPrice(product);
    if (quantity !== item.quantity || price !== item.price) changed = true;
    validItems.push({ product: product._id, quantity, price });
  }

  if (changed) {
    await Cart.updateOne({ user: req.user.id }, { $set: { items: validItems } });
    cart = await Cart.findOne({ user: req.user.id })
      .populate('items.product', CART_PRODUCT_FIELDS)
      .lean();
  }

  res.set('Cache-Control', 'private, no-store');
  res.json({ success: true, cart: shapeCart(cart) });
});

// @route   POST /api/cart/add
// @desc    Add item to cart
// @access  Customer
router.post('/add', protect, authorize('customer'), async (req, res) => {
  const { productId } = req.body;
  const quantity = parseQuantity(req.body.quantity);
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product' });
  }

  const product = await getAvailableProduct(productId, quantity);
  if (!product) {
    return res.status(400).json({ success: false, message: 'Product unavailable or insufficient stock' });
  }

  const price = discountedPrice(product);
  let cart = await Cart.findOne({ user: req.user.id }).select('items');

  if (!cart) {
    await Cart.create({
      user: req.user.id,
      items: [{ product: productId, quantity, price }],
    });
  } else {
    const existingItem = cart.items.find((item) => item.product.toString() === productId);
    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (product.stock < newQty) {
        return res.status(400).json({ success: false, message: 'Insufficient stock' });
      }
      existingItem.quantity = newQty;
      existingItem.price = price;
    } else {
      cart.items.push({ product: productId, quantity, price });
    }
    await cart.save();
  }

  res.json({ success: true, cart: await hydrateCart(req.user.id) });
});

// @route   PUT /api/cart/update
// @desc    Update item quantity in cart
// @access  Customer
router.put('/update', protect, authorize('customer'), async (req, res) => {
  const { productId } = req.body;
  const quantity = parseQuantity(req.body.quantity, 0);
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product' });
  }
  if (quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });

  const product = await getAvailableProduct(productId, quantity);
  if (!product) {
    return res.status(400).json({ success: false, message: 'Product unavailable or insufficient stock' });
  }

  const cart = await Cart.findOne({ user: req.user.id }).select('items');
  if (!cart) return res.status(404).json({ success: false, message: 'Cart not found' });

  const item = cart.items.find((i) => i.product.toString() === productId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });

  item.quantity = quantity;
  item.price = discountedPrice(product);
  await cart.save();

  res.json({ success: true, cart: await hydrateCart(req.user.id) });
});

// @route   DELETE /api/cart/remove/:productId
// @desc    Remove item from cart
// @access  Customer
router.delete('/remove/:productId', protect, authorize('customer'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.status(400).json({ success: false, message: 'Invalid product' });
  }

  const result = await Cart.updateOne(
    { user: req.user.id },
    { $pull: { items: { product: req.params.productId } } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ success: false, message: 'Cart not found' });
  }

  res.json({ success: true, cart: await hydrateCart(req.user.id) });
});

// @route   DELETE /api/cart/clear
// @desc    Clear cart
// @access  Customer
router.delete('/clear', protect, authorize('customer'), async (req, res) => {
  await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
  res.json({ success: true, message: 'Cart cleared' });
});

module.exports = router;
