import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, categoryLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products/seller/my');
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
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p._id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Delete failed'); }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">My Products 🏪</h1>
        <Link to="/seller/products/add" className="btn-primary text-sm">+ Add Product</Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📦</div>
          <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">No products yet</p>
          <Link to="/seller/products/add" className="btn-primary inline-flex">Add Your First Product</Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {products.map((product) => (
            <div key={product._id} className="card p-4 flex items-center gap-4">
              <img src={product.image || `https://via.placeholder.com/60x60?text=${encodeURIComponent(product.name)}`}
                alt={product.name} loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover bg-gray-100 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{product.name}</h3>
                  <span className="text-xs text-gray-400">{categoryLabel[product.category]}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>Stock: <strong className={product.stock < 5 ? 'text-red-500' : 'text-green-600'}>{product.stock}</strong></span>
                  <span>Sold: {product.salesCount}</span>
                  {product.discount > 0 && <span className="text-orange-500">{product.discount}% OFF</span>}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-bold text-orange-500">{formatCurrency(product.discountedPrice || product.price)}</p>
                {product.discount > 0 && (
                  <p className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</p>
                )}
              </div>

              {/* Toggle availability */}
              <button onClick={() => toggleAvailable(product)}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-all relative ${
                  product.isAvailable && product.stock > 0 ? 'bg-green-500' : 'bg-gray-300'
                }`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  product.isAvailable ? 'left-6' : 'left-0.5'
                }`} />
              </button>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Link to={`/seller/products/edit/${product._id}`}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-orange-500 transition-all text-sm">
                  ✏️
                </Link>
                <button onClick={() => deleteProduct(product._id, product.name)}
                  className="p-2 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-500 transition-all text-sm">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
