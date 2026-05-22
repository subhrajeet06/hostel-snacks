import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { categoryLabel, formatCurrency } from '../utils/helpers';

const escapeSvgText = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const placeholderSvg = (name = 'Product') => (
  `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="220" viewBox="0 0 320 220">
      <rect width="320" height="220" fill="#f3f4f6"/>
      <circle cx="160" cy="92" r="34" fill="#fed7aa"/>
      <text x="160" y="152" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700" fill="#9a3412">${escapeSvgText(name).slice(0, 22)}</text>
    </svg>
  `)}`
);

function ProductCard({ product, priority = false }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const fallback = placeholderSvg(product.name);
  const imageSrc = product.image || fallback;

  const handleImageError = useCallback((event) => {
    if (event.currentTarget.src !== fallback) {
      event.currentTarget.src = fallback;
    }
  }, [fallback]);

  return (
    <div className="card group hover:shadow-md transition-all duration-200">
      <div className="relative overflow-hidden bg-gray-100 h-40 sm:h-44">
        <img
          src={imageSrc}
          alt={product.name}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
        />
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {product.discount}% OFF
          </span>
        )}
        {product.stock < 5 && product.stock > 0 && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            Only {product.stock} left
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 font-medium mb-1">{categoryLabel[product.category]}</p>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-1 line-clamp-1">{product.name}</h3>
        {product.description && <p className="text-xs text-gray-400 mb-2 line-clamp-1">{product.description}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="font-bold text-orange-500">{formatCurrency(product.discountedPrice || product.price)}</span>
            {product.discount > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">{formatCurrency(product.price)}</span>
            )}
          </div>
          {user?.role === 'customer' ? (
            <button
              onClick={() => addToCart(product._id)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95 flex-shrink-0"
            >
              + Add
            </button>
          ) : !user ? (
            <Link to="/login" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex-shrink-0">
              Login
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card animate-pulse">
          <div className="h-40 sm:h-44 bg-gray-100 dark:bg-gray-800" />
          <div className="p-4 space-y-3">
            <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded" />
            <div className="flex items-center justify-between">
              <div className="h-5 w-14 bg-gray-100 dark:bg-gray-800 rounded" />
              <div className="h-8 w-14 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default memo(ProductCard);
