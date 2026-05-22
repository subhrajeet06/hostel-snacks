import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/helpers';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, loadingCart, fetchCart } = useCart();
  const navigate = useNavigate();

  // Re-fetch cart on mount to auto-clean unavailable items (backend handles cleanup)
  useEffect(() => { fetchCart(); }, [fetchCart]);

  if (loadingCart) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  }

  if (!cart.items.length) {
    return (
      <div className="text-center py-24">
        <div className="text-8xl mb-4">🛒</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6">Looks like you haven't added anything yet!</p>
        <Link to="/products" className="btn-primary inline-flex">Browse Menu 🍿</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">🛒 Your Cart</h1>

      <div className="space-y-3 mb-6">
        {cart.items.map((item) => {
          const product = item.product;
          const productId = product?._id || item.product;
          const isUnavailable = !product || !product.isAvailable || product.stock < 1;

          return (
            <div key={productId} className={`card p-4 flex items-center gap-4 ${isUnavailable ? 'opacity-60 border-red-200 dark:border-red-800' : ''}`}>
              <img
                src={product?.image || `https://via.placeholder.com/80x80?text=🍟`}
                alt={product?.name || 'Unavailable'}
                loading="lazy"
                decoding="async"
                className="w-16 h-16 object-cover rounded-xl bg-gray-100 flex-shrink-0"
                onError={(e) => { e.target.src = `https://via.placeholder.com/80x80?text=🍟`; }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product?.name || 'Product Unavailable'}</h3>
                {isUnavailable ? (
                  <p className="text-red-500 font-bold text-xs">❌ No longer available</p>
                ) : (
                  <p className="text-orange-500 font-bold text-sm">{formatCurrency(item.price)}</p>
                )}
              </div>
              {/* Quantity controls — only show for available products */}
              {!isUnavailable && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => item.quantity > 1 ? updateQuantity(productId, item.quantity - 1) : removeFromCart(productId)}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-orange-100 text-gray-700 dark:text-gray-300 font-bold flex items-center justify-center transition-all"
                  >−</button>
                  <span className="w-6 text-center font-bold text-sm text-gray-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(productId, item.quantity + 1)}
                    disabled={item.quantity >= (product?.stock || 99)}
                    className="w-8 h-8 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-600 font-bold flex items-center justify-center transition-all disabled:opacity-40"
                  >+</button>
                </div>
              )}
              {/* Subtotal */}
              <div className="text-right w-16">
                {!isUnavailable && (
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
                )}
              </div>
              {/* Remove */}
              <button onClick={() => removeFromCart(productId)}
                className="text-red-400 hover:text-red-600 p-1 rounded transition-all flex-shrink-0">✕</button>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal ({cart.items.length} items)</span>
            <span>{formatCurrency(cart.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Delivery</span>
            <span className="text-green-500 font-medium">FREE</span>
          </div>
          <hr className="border-gray-100 dark:border-gray-800 my-2" />
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white">
            <span>Total</span>
            <span className="text-orange-500">{formatCurrency(cart.totalAmount)}</span>
          </div>
        </div>
      </div>

      <button onClick={() => navigate('/checkout')} className="btn-primary w-full text-base py-3">
        Proceed to Checkout →
      </button>
      <Link to="/products" className="block text-center mt-3 text-sm text-gray-500 hover:text-orange-500 transition-all">
        ← Continue Shopping
      </Link>
    </div>
  );
}
