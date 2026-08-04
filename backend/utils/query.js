const parsePositiveInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parsePagination = (query, { defaultLimit = 20, maxLimit = 50 } = {}) => {
  const page = parsePositiveInt(query.page, 1, 100000);
  const limit = parsePositiveInt(query.limit, defaultLimit, maxLimit);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const cleanSearchTerm = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ').slice(0, 80);
};

const productProjection = {
  name: 1,
  description: 1,
  price: 1,
  category: 1,
  image: 1,
  stock: 1,
  isAvailable: 1,
  seller: 1,
  salesCount: 1,
  rating: 1,
  discount: 1,
  createdAt: 1,
  updatedAt: 1,
};

const safeUserProjection = {
  name: 1,
  email: 1,
  role: 1,
  phone: 1,
  roomNumber: 1,
  isActive: 1,
  isEmailVerified: 1,
  avatar: 1,
  // Used internally by the auth middleware to validate JWT session — never
  // sent to the client (stripped in middleware/auth.js before attaching to req.user).
  tokenVersion: 1,
  createdAt: 1,
  updatedAt: 1,
};

const discountedPrice = (product) => {
  const price = Number(product?.price || 0);
  const discount = Number(product?.discount || 0);
  return price - (price * discount) / 100;
};

const shapeProduct = (product) => {
  if (!product) return product;
  const plain = typeof product.toObject === 'function' ? product.toObject() : product;
  return {
    ...plain,
    discountedPrice: discountedPrice(plain),
  };
};

const shapeProducts = (products) => products.map(shapeProduct);

module.exports = {
  cleanSearchTerm,
  discountedPrice,
  parsePagination,
  productProjection,
  safeUserProjection,
  shapeProduct,
  shapeProducts,
};
