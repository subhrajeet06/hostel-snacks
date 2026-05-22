const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['chips', 'kurkure', 'biscuits', 'chocolates', 'noodles', 'other'],
    },
    image: {
      type: String,
      default: '',
    },
    stock: {
      type: Number,
      required: [true, 'Stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salesCount: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100, // percentage
    },
  },
  { timestamps: true }
);

// Virtual for discounted price
productSchema.virtual('discountedPrice').get(function () {
  return this.price - (this.price * this.discount) / 100;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

productSchema.index({ isAvailable: 1, stock: 1, createdAt: -1 });
productSchema.index({ category: 1, isAvailable: 1, stock: 1, price: 1 });
productSchema.index({ isAvailable: 1, stock: 1, salesCount: -1 });
productSchema.index({ seller: 1, createdAt: -1 });
productSchema.index(
  { name: 'text', description: 'text' },
  { weights: { name: 10, description: 2 }, name: 'ProductTextSearch' }
);

module.exports = mongoose.model('Product', productSchema);
