const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all available products (with search & filter)
// @access  Public
router.get('/', async (req, res) => {
  const { category, search, sort, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

  const query = { isAvailable: true, stock: { $gt: 0 } };

  if (category && category !== 'all') query.category = category;
  if (search) query.name = { $regex: search, $options: 'i' };
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  let sortObj = { createdAt: -1 };
  if (sort === 'price_asc') sortObj = { price: 1 };
  if (sort === 'price_desc') sortObj = { price: -1 };
  if (sort === 'popular') sortObj = { salesCount: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('seller', 'name')
    .sort(sortObj)
    .skip(skip)
    .limit(Number(limit));

  res.json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    products,
  });
});

// @route   GET /api/products/top
// @desc    Get top selling products
// @access  Public
router.get('/top', async (req, res) => {
  const products = await Product.find({ isAvailable: true, stock: { $gt: 0 } })
    .sort({ salesCount: -1 })
    .limit(8)
    .populate('seller', 'name');
  res.json({ success: true, products });
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate('seller', 'name');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, product });
});

// @route   POST /api/products
// @desc    Create product
// @access  Seller/Admin
router.post('/', protect, authorize('seller', 'admin'), async (req, res) => {
  const { name, description, price, category, image, stock, discount } = req.body;
  const product = await Product.create({
    name, description, price, category, image, stock, discount,
    seller: req.user.id,
  });
  res.status(201).json({ success: true, product });
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Seller (own) / Admin
router.put('/:id', protect, authorize('seller', 'admin'), async (req, res) => {
  let product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  // Sellers can only edit their own products
  if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this product' });
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  res.json({ success: true, product });
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Seller (own) / Admin
router.delete('/:id', protect, authorize('seller', 'admin'), async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
  }

  await product.deleteOne();
  res.json({ success: true, message: 'Product deleted' });
});

// @route   GET /api/products/seller/my
// @desc    Get seller's own products
// @access  Seller
router.get('/seller/my', protect, authorize('seller', 'admin'), async (req, res) => {
  const products = await Product.find({ seller: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, products });
});

module.exports = router;
