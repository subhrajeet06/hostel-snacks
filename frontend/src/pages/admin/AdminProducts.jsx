import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatCurrency, categoryLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products');
      setProducts(res.data.products);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const toggleAvailable = async (product) => {
    try {
      const res = await api.put(`/products/${product._id}`, { isAvailable: !product.isAvailable });
      setProducts((prev) => prev.map((p) => p._id === product._id ? res.data.product : p));
      toast.success(`${product.name} ${res.data.product.isAvailable ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Update failed'); }
  };

  const deleteProduct = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Delete failed'); }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.seller?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">All Products 🏪</h1>
        <span className="text-sm text-gray-500 font-medium">{products.length} total</span>
      </div>

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search products or seller..." value={search}
          onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Product','Category','Price','Stock','Seller','Status','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filtered.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={p.image || `https://via.placeholder.com/40x40?text=${encodeURIComponent(p.name)}`}
                          alt={p.name} className="w-10 h-10 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
                          {p.discount > 0 && <span className="text-xs text-orange-500">{p.discount}% off</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{categoryLabel[p.category]}</td>
                    <td className="px-4 py-3 font-semibold text-orange-500">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${p.stock < 5 ? 'text-red-500' : 'text-green-600'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.seller?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAvailable(p)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all ${
                          p.isAvailable && p.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                        {p.isAvailable && p.stock > 0 ? '● Live' : '○ Off'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteProduct(p._id, p.name)}
                        className="text-red-400 hover:text-red-600 text-xs transition-all">🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
