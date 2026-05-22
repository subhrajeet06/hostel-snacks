import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import ProductCard, { ProductGridSkeleton } from '../../components/ProductCard';

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'chips', label: 'Chips' },
  { key: 'kurkure', label: 'Kurkure' },
  { key: 'biscuits', label: 'Biscuits' },
  { key: 'chocolates', label: 'Choco' },
  { key: 'noodles', label: 'Noodles' },
  { key: 'other', label: 'Other' },
];

const OFFERS = [
  { text: 'Fast delivery', sub: '< 15 mins' },
  { text: 'HOSTEL10', sub: '10% off first order' },
  { text: 'FIRST20', sub: '20% off new users' },
  { text: 'UPI & COD', sub: 'Multiple payments' },
];

export default function HomePage() {
  const [topProducts, setTopProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    api.get('/products/home', { signal: controller.signal })
      .then((res) => {
        setTopProducts(res.data.topProducts || []);
        setAllProducts(res.data.products || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => (
    activeCategory === 'all'
      ? allProducts
      : allProducts.filter((product) => product.category === activeCategory)
  ), [activeCategory, allProducts]);

  return (
    <div className="space-y-10">
      <div className="relative bg-gradient-to-r from-orange-500 to-amber-400 rounded-3xl p-8 md:p-12 overflow-hidden">
        <div className="relative z-10">
          <p className="text-orange-100 font-medium text-sm mb-2">Hostel Delivery</p>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            Midnight hunger?<br />We got you.
          </h1>
          <p className="text-orange-100 mb-6 text-sm md:text-base">
            Chips, biscuits, Kurkure, cold drinks delivered straight to your room.
          </p>
          <Link to="/products" className="inline-flex items-center gap-2 bg-white text-orange-600 font-bold px-6 py-3 rounded-2xl hover:shadow-lg transition-all hover:-translate-y-0.5">
            Order Now
          </Link>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-8xl opacity-30 hidden md:block">🍟</div>
        <div className="absolute right-32 top-4 text-4xl opacity-20">🥤</div>
        <div className="absolute right-20 bottom-4 text-5xl opacity-20">🍪</div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {OFFERS.map((item) => (
          <div key={item.text} className="flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-3 min-w-[160px]">
            <p className="text-xs font-bold text-gray-900 dark:text-white">{item.text}</p>
            <p className="text-xs text-gray-500">{item.sub}</p>
          </div>
        ))}
      </div>

      {topProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Top Selling</h2>
            <Link to="/products?sort=popular" className="text-sm text-orange-500 font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {topProducts.map((product, index) => (
              <ProductCard key={product._id} product={product} priority={index < 4} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-4">Browse Menu</h2>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-200'
                  : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <ProductGridSkeleton count={8} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((product, index) => (
              <ProductCard key={product._id} product={product} priority={index < 4} />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-400">
                <p className="font-medium">No products in this category</p>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
