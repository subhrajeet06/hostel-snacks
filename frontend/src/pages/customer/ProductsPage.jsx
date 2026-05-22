import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import { categoryLabel } from '../../utils/helpers';
import ProductCard, { ProductGridSkeleton } from '../../components/ProductCard';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const CATEGORIES = ['all', 'chips', 'kurkure', 'biscuits', 'chocolates', 'noodles', 'other'];
const PAGE_SIZE = 16;
const SORTS = [
  { value: '', label: 'Newest' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [category, setCategory] = useState(params.get('category') || 'all');
  const [sort, setSort] = useState(params.get('sort') || '');
  const [page, setPage] = useState(Number(params.get('page') || 1));
  const debouncedSearch = useDebouncedValue(search, 300);

  const queryString = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
    if (category && category !== 'all') q.set('category', category);
    if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
    if (sort) q.set('sort', sort);
    return q.toString();
  }, [category, debouncedSearch, page, sort]);

  useEffect(() => {
    const nextParams = {};
    if (category !== 'all') nextParams.category = category;
    if (sort) nextParams.sort = sort;
    if (debouncedSearch.trim()) nextParams.search = debouncedSearch.trim();
    if (page > 1) nextParams.page = String(page);
    setParams(nextParams, { replace: true });
  }, [category, debouncedSearch, page, setParams, sort]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    api.get(`/products?${queryString}`, { signal: controller.signal })
      .then((res) => {
        setProducts(res.data.products);
        setTotal(res.data.total);
      })
      .catch((error) => {
        if (error.name !== 'CanceledError') {
          setProducts([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [queryString]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">Full Menu</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <form onSubmit={(event) => { event.preventDefault(); setPage(1); }} className="flex-1 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Search chips, drinks, biscuits..."
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
          <button type="submit" className="btn-primary px-4">Search</button>
        </form>
        <select className="input w-auto" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
          {SORTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

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
            {cat === 'all' ? 'All' : categoryLabel[cat]}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {loading ? 'Loading products...' : `${total} products found`}
      </p>

      {loading ? (
        <ProductGridSkeleton count={PAGE_SIZE} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product, index) => (
              <ProductCard key={product._id} product={product} priority={index < 4} />
            ))}
          </div>

          {products.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="font-medium">No products found</p>
              <button
                onClick={() => { setSearch(''); setCategory('all'); setSort(''); setPage(1); }}
                className="mt-3 text-orange-500 text-sm font-medium"
              >
                Clear filters
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="btn-secondary px-4 py-2 disabled:opacity-40">Prev</button>
              <span className="flex items-center px-4 text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} className="btn-secondary px-4 py-2 disabled:opacity-40">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
