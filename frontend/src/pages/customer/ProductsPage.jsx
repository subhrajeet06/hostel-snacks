import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, categoryLabel } from '../../utils/helpers';
import { Link } from 'react-router-dom';

const CATEGORIES = ['all','chips','kurkure','biscuits','chocolates','noodles','other'];
const SORTS = [
  { value: '', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();

  return (
    <div className="card group hover:shadow-md transition-all duration-200">
      <div className="relative overflow-hidden bg-gray-100 h-40">
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
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-400 mb-1">{categoryLabel[product.category]}</p>
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 line-clamp-1">{product.name}</h3>
        {product.description && <p className="text-xs text-gray-400 mb-2 line-clamp-1">{product.description}</p>}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-bold text-orange-500">{formatCurrency(product.discountedPrice || product.price)}</span>
            {product.discount > 0 && (
              <span className="text-xs text-gray-400 line-through ml-1">{formatCurrency(product.price)}</span>
            )}
          </div>
          {user?.role === 'customer' ? (
            <button onClick={() => addToCart(product._id)}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95">
              + Add
            </button>
          ) : !user ? (
            <Link to="/login" className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-xl">Login</Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [sort, setSort]         = useState(params.get('sort') || '');
  const [page, setPage]         = useState(1);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page, limit: 16 });
      if (category && category !== 'all') q.set('category', category);
      if (search) q.set('search', search);
      if (sort) q.set('sort', sort);
      const res = await api.get(`/products?${q}`);
      setProducts(res.data.products);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [category, sort, page]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchProducts(); };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">🍿 Full Menu</h1>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Search chips, drinks, biscuits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4">🔍</button>
        </form>
        <select className="input w-auto" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setPage(1); }}
            className={`flex-shrink-0 capitalize px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
              category === cat
                ? 'bg-orange-500 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-300'
            }`}
          >
            {cat === 'all' ? '🏪 All' : categoryLabel[cat]}
          </button>
        ))}
      </div>

      {/* Results info */}
      <p className="text-sm text-gray-500 mb-4">{total} products found</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="dot-loader flex gap-2"><span /><span /><span /></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((p) => <ProductCard key={p._id} product={p} />)}
          </div>
          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🔍</div>
              <p className="font-medium">No products found</p>
              <button onClick={() => { setSearch(''); setCategory('all'); setSort(''); }} className="mt-3 text-orange-500 text-sm font-medium">Clear filters</button>
            </div>
          )}

          {/* Pagination */}
          {total > 16 && (
            <div className="flex justify-center gap-2 mt-8">
              <button disabled={page === 1} onClick={() => setPage(page - 1)} className="btn-secondary px-4 py-2 disabled:opacity-40">← Prev</button>
              <span className="flex items-center px-4 text-sm text-gray-600">Page {page}</span>
              <button disabled={page * 16 >= total} onClick={() => setPage(page + 1)} className="btn-secondary px-4 py-2 disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
