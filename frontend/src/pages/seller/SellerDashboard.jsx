import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/helpers';
import { subscribeSocketEvent } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

export default function SellerDashboard() {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [ordRes, proRes] = await Promise.all([
        api.get('/orders/seller/all?limit=5'),
        api.get('/products/seller/my'),
      ]);
      setOrders(ordRes.data.orders);
      setProducts(proRes.data.products);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    return subscribeSocketEvent('new_order', ({ totalAmount }) => {
      toast.success(`New order! ${formatCurrency(totalAmount)}`);
      fetchData();
    });
  }, [fetchData]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    revenue: orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + (o.sellerAmount ?? o.totalAmount), 0),
    lowStock: products.filter((p) => p.stock < 5).length,
  }), [orders, products]);

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Dashboard 📊</h1>
        <Link to="/seller/products/add" className="btn-primary text-sm">+ Add Product</Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Recent Orders', value: stats.total, icon: '📦', color: 'blue' },
          { label: 'Pending', value: stats.pending, icon: '⏳', color: 'yellow' },
          { label: 'Revenue', value: formatCurrency(stats.revenue), icon: '💰', color: 'green' },
          { label: 'Low Stock', value: stats.lowStock, icon: '⚠️', color: 'red' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-2xl font-display font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
            <Link to="/seller/orders" className="text-xs text-orange-500 font-medium hover:underline">View all →</Link>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((o) => (
                <div key={o._id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">#{o._id.slice(-6).toUpperCase()}</p>
                    <p className="text-xs text-gray-500">Room {o.roomNumber} · {o.items.length} item(s)</p>
                    <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`badge ${statusColor[o.status]} text-xs`}>{statusLabel[o.status]}</span>
                    <p className="text-sm font-bold text-orange-500 mt-1">{formatCurrency(o.sellerAmount ?? o.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">My Products</h2>
            <Link to="/seller/products" className="text-xs text-orange-500 font-medium hover:underline">Manage →</Link>
          </div>
          {products.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 mb-2">No products yet</p>
              <Link to="/seller/products/add" className="btn-primary text-sm py-2">Add First Product</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {products.slice(0, 5).map((p) => (
                <div key={p._id} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <img src={p.image || `https://via.placeholder.com/40x40?text=${encodeURIComponent(p.name)}`}
                    alt={p.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">Stock: {p.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-orange-500">{formatCurrency(p.price)}</p>
                    <span className={`text-xs font-medium ${p.isAvailable && p.stock > 0 ? 'text-green-500' : 'text-red-400'}`}>
                      {p.isAvailable && p.stock > 0 ? '● Live' : '● Off'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
