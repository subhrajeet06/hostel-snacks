import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, categoryLabel } from '../../utils/helpers';

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();

  return (
    <div className="card group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="relative overflow-hidden bg-gray-100 h-44">
        <img
          src={product.image || `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}`}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => { e.target.src = `https://via.placeholder.com/300x200?text=${encodeURIComponent(product.name)}`; }}
        />
        {product.discount > 0 && (
          <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            {product.discount}% OFF
          </span>
        )}
        {product.stock < 5 && product.stock > 0 && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
            Only {product.stock} left!
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 font-medium mb-1">{categoryLabel[product.category]}</p>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight mb-2 line-clamp-1">{product.name}</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-orange-500">{formatCurrency(product.discountedPrice || product.price)}</span>
            {product.discount > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">{formatCurrency(product.price)}</span>
            )}
          </div>
          {user?.role === 'customer' ? (
            <button
              onClick={() => addToCart(product._id)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95"
            >
              + Add
            </button>
          ) : !user ? (
            <Link to="/login" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all">
              Login
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { key: 'all',       icon: '🏪', label: 'All' },
  { key: 'chips',     icon: '🥔', label: 'Chips' },
  { key: 'kurkure',   icon: '🌶️', label: 'Kurkure' },
  { key: 'biscuits',  icon: '🍪', label: 'Biscuits' },
  { key: 'chocolates',icon: '🍫', label: 'Choco' },
  { key: 'noodles',   icon: '🍜', label: 'Noodles' },
  { key: 'other',     icon: '🛍️', label: 'Other' },
];

export default function HomePage() {
  const [topProducts, setTopProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topRes, allRes] = await Promise.all([
          api.get('/products/top'),
          api.get('/products?limit=12'),
        ]);
        setTopProducts(topRes.data.products);
        setAllProducts(allRes.data.products);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const filtered = activeCategory === 'all'
    ? allProducts
    : allProducts.filter((p) => p.category === activeCategory);

  return (
    <div className="space-y-10">
      {/* Hero Banner */}
      <div className="relative bg-gradient-to-r from-orange-500 to-amber-400 rounded-3xl p-8 md:p-12 overflow-hidden">
        <div className="relative z-10">
          <p className="text-orange-100 font-medium text-sm mb-2">🏠 Hostel Delivery</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Midnight hunger?<br />We got you. 🍟
          </h1>
          <p className="text-orange-100 mb-6 text-sm md:text-base">
            Chips, biscuits, Kurkure, cold drinks — delivered straight to your room!
          </p>
          <Link to="/products" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5">
            Order Now →
          </Link>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-30 hidden md:block">🍟</div>
        <div className="absolute right-32 top-4 text-4xl opacity-20">🥤</div>
        <div className="absolute right-20 bottom-4 text-5xl opacity-20">🍪</div>
      </div>

      {/* Quick offer banner */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { emoji: '🚀', text: 'Fast delivery', sub: '< 15 mins' },
          { emoji: '💰', text: 'HOSTEL10', sub: '10% off first order' },
          { emoji: '🎁', text: 'FIRST20', sub: '20% off new users' },
          { emoji: '💳', text: 'UPI & COD', sub: 'Multiple payments' },
        ].map((item) => (
          <div key={item.text} className="flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[160px]">
            <span className="text-2xl">{item.emoji}</span>
            <div>
              <p className="text-xs font-bold text-gray-900 dark:text-white">{item.text}</p>
              <p className="text-xs text-gray-500">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Selling */}
      {topProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              🔥 Top Selling
            </h2>
            <Link to="/products?sort=popular" className="text-sm text-orange-500 font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {topProducts.slice(0, 8).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Category filter + All products */}
      <section>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4">Browse Menu</h2>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300'
              }`}
            >
              <span>{cat.icon}</span> {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="dot-loader flex gap-2"><span /><span /><span /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p._id} product={p} />)}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">🤷</div>
                <p className="font-medium">No products in this category</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
