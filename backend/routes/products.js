const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');
const { delByPrefix, getOrSet, stableKey } = require('../utils/cache');
const {
  cleanSearchTerm,
  parsePagination,
  productProjection,
  shapeProduct,
  shapeProducts,
} = require('../utils/query');
const {
  createProductValidator,
  updateProductValidator,
  productIdParamValidator,
} = require('../validators/productValidators');
const { logAudit, diffChanges } = require('../utils/auditLogger');

const PRODUCT_CACHE_TTL = 30;
const TOP_PRODUCT_CACHE_TTL = 60;

const invalidateProductCaches = () => {
  delByPrefix('products:');
  delByPrefix('products-home:');
  delByPrefix('admin-stats:');
  delByPrefix('admin-order-stats:');
};

const buildProductQuery = ({ category, search, minPrice, maxPrice }) => {
  const query = { isAvailable: true, stock: { $gt: 0 } };
  const searchTerm = cleanSearchTerm(search);

  if (category && category !== 'all') query.category = category;
  if (searchTerm) query.$text = { $search: searchTerm };
  if (minPrice || maxPrice) {
    query.price = {};
    const min = Number(minPrice);
    const max = Number(maxPrice);
    if (Number.isFinite(min)) query.price.$gte = min;
    if (Number.isFinite(max)) query.price.$lte = max;
  }

  return { query, searchTerm };
};

const buildProductSort = (sort, searchTerm) => {
  if (sort === 'price_asc') return { price: 1, _id: 1 };
  if (sort === 'price_desc') return { price: -1, _id: 1 };
  if (sort === 'popular') return { salesCount: -1, _id: 1 };
  if (searchTerm) return { score: { $meta: 'textScore' }, createdAt: -1 };
  return { createdAt: -1, _id: -1 };
};

const publicCacheHeaders = (res, hit, seconds = PRODUCT_CACHE_TTL) => {
  res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 2}`);
  res.set('X-Cache', hit ? 'HIT' : 'MISS');
};

// @route   GET /api/products
// @desc    Get available products with indexed search/filter/sort
// @access  Public
router.get('/', async (req, res) => {
  const { category, search, sort, minPrice, maxPrice } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const cacheKey = stableKey('products:list', { category, search, sort, minPrice, maxPrice, page, limit });

  const { value, hit } = await getOrSet(cacheKey, PRODUCT_CACHE_TTL, async () => {
    const { query, searchTerm } = buildProductQuery({ category, search, minPrice, maxPrice });
    const projection = searchTerm ? { ...productProjection, score: { $meta: 'textScore' } } : productProjection;
    const sortObj = buildProductSort(sort, searchTerm);

    const [total, products] = await Promise.all([
      Product.countDocuments(query),
      Product.find(query, projection)
        .populate('seller', 'name')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      products: shapeProducts(products),
    };
  });

  publicCacheHeaders(res, hit);
  res.json(value);
});

// @route   GET /api/products/home
// @desc    Get home page product sections in one cached request
// @access  Public
router.get('/home', async (req, res) => {
  const cacheKey = stableKey('products-home', { limit: 12 });

  const { value, hit } = await getOrSet(cacheKey, TOP_PRODUCT_CACHE_TTL, async () => {
    const baseQuery = { isAvailable: true, stock: { $gt: 0 } };
    const [topProducts, products] = await Promise.all([
      Product.find(baseQuery, productProjection)
        .populate('seller', 'name')
        .sort({ salesCount: -1, _id: 1 })
        .limit(8)
        .lean(),
      Product.find(baseQuery, productProjection)
        .populate('seller', 'name')
        .sort({ createdAt: -1, _id: -1 })
        .limit(12)
        .lean(),
    ]);

    return {
      success: true,
      topProducts: shapeProducts(topProducts),
      products: shapeProducts(products),
    };
  });

  publicCacheHeaders(res, hit, TOP_PRODUCT_CACHE_TTL);
  res.json(value);
});

// @route   GET /api/products/top
// @desc    Get top selling products
// @access  Public
router.get('/top', async (req, res) => {
  const cacheKey = stableKey('products:top', { limit: 8 });

  const { value, hit } = await getOrSet(cacheKey, TOP_PRODUCT_CACHE_TTL, async () => {
    const products = await Product.find({ isAvailable: true, stock: { $gt: 0 } }, productProjection)
      .sort({ salesCount: -1, _id: 1 })
      .limit(8)
      .populate('seller', 'name')
      .lean();

    return { success: true, products: shapeProducts(products) };
  });

  publicCacheHeaders(res, hit, TOP_PRODUCT_CACHE_TTL);
  res.json(value);
});

// @route   GET /api/products/seller/my
// @desc    Get seller's own products
// @access  Seller
router.get('/seller/my', protect, authorize('seller', 'admin'), async (req, res) => {
  const products = await Product.find({ seller: req.user.id }, productProjection)
    .sort({ createdAt: -1, _id: -1 })
    .lean();

  res.set('Cache-Control', 'private, no-cache');
  res.json({ success: true, products: shapeProducts(products) });
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', productIdParamValidator, async (req, res) => {
  const product = await Product.findById(req.params.id, productProjection)
    .populate('seller', 'name')
    .lean();

  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json({ success: true, product: shapeProduct(product) });
});

// @route   POST /api/products
// @desc    Create product
// @access  Seller/Admin
router.post('/', protect, authorize('seller', 'admin'), createProductValidator, async (req, res) => {
  const { name, description, price, category, image, stock, discount } = req.body;
  const product = await Product.create({
    name,
    description,
    price,
    category,
    image,
    stock,
    discount,
    seller: req.user.id,
  });

  invalidateProductCaches();
  logAudit(req, { action: 'product_created', resourceType: 'product', resourceId: product._id.toString() });

  const freshProduct = await Product.findById(product._id, productProjection)
    .populate('seller', 'name')
    .lean();

  res.status(201).json({ success: true, product: shapeProduct(freshProduct) });
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Seller (own) / Admin
router.put('/:id', protect, authorize('seller', 'admin'), updateProductValidator, async (req, res) => {
  const product = await Product.findById(req.params.id).select('seller name price stock discount isAvailable description category image').lean();
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to edit this product' });
  }

  // Whitelist updatable fields explicitly instead of passing req.body
  // straight to findByIdAndUpdate. This prevents mass-assignment of fields
  // the client should never control (e.g. seller, salesCount, rating) —
  // the frontend never sends those fields today, so this is not a
  // behavior change for legitimate requests.
  const UPDATABLE_FIELDS = ['name', 'description', 'price', 'category', 'image', 'stock', 'discount', 'isAvailable'];
  const updates = {};
  for (const field of UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const updated = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  })
    .select(productProjection)
    .populate('seller', 'name')
    .lean();

  // Audit: capture what changed. Log specific sub-actions for price/inventory.
  const changes = diffChanges(product, updates, Object.keys(updates));
  logAudit(req, { action: 'product_updated', resourceType: 'product', resourceId: req.params.id, changes });
  if (updates.price !== undefined && String(updates.price) !== String(product.price)) {
    logAudit(req, { action: 'price_updated', resourceType: 'product', resourceId: req.params.id, changes: { price: { from: product.price, to: updates.price } } });
  }
  if (updates.stock !== undefined && String(updates.stock) !== String(product.stock)) {
    logAudit(req, { action: 'inventory_updated', resourceType: 'product', resourceId: req.params.id, changes: { stock: { from: product.stock, to: updates.stock } } });
  }

  invalidateProductCaches();
  res.json({ success: true, product: shapeProduct(updated) });
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Seller (own) / Admin
router.delete('/:id', protect, authorize('seller', 'admin'), productIdParamValidator, async (req, res) => {
  const product = await Product.findById(req.params.id).select('seller').lean();
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

  if (req.user.role === 'seller' && product.seller.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to delete this product' });
  }

  await Product.deleteOne({ _id: req.params.id });
  logAudit(req, { action: 'product_deleted', resourceType: 'product', resourceId: req.params.id });
  invalidateProductCaches();
  res.json({ success: true, message: 'Product deleted' });
});

module.exports = router;
