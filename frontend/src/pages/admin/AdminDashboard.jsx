import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/helpers';

function MiniBar({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-24 truncate">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-8 text-right">{value}</span>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data.stats)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  if (!stats) return <div className="text-center py-16 text-gray-400">Failed to load stats</div>;

  const statusPieData = stats.ordersByStatus || [];
  const maxCount = Math.max(...(statusPieData.map((s) => s.count) || [1]));

  return (
    <div>
      <h1 className="page-header">Admin Dashboard 📊</h1>

      {/* Primary stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Total Orders',    value: stats.totalOrders,              icon: '📦', big: false },
          { label: 'Total Revenue',   value: formatCurrency(stats.totalRevenue), icon: '💰', big: true },
          { label: 'Active Users',    value: stats.activeUsers,              icon: '👤', big: false },
          { label: 'Products',        value: stats.totalProducts,            icon: '🏪', big: false },
          { label: 'Pending Orders',  value: stats.pendingOrders,            icon: '⏳', big: false },
          { label: 'Sellers',         value: stats.totalSellers,             icon: '👨‍🍳', big: false },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <span className="text-2xl">{s.icon}</span>
            <p className={`font-display font-bold text-gray-900 dark:text-white ${s.big ? 'text-xl' : 'text-2xl'}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Revenue chart (simplified bar) */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">📈 Revenue (Last 7 Days)</h2>
          {stats.revenueByDay.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No revenue data yet</p>
          ) : (
            <div className="flex items-end gap-2 h-32">
              {stats.revenueByDay.map((d) => {
                const maxRev = Math.max(...stats.revenueByDay.map((x) => x.revenue));
                const h = maxRev > 0 ? (d.revenue / maxRev) * 100 : 0;
                return (
                  <div key={d._id} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">{formatCurrency(d.revenue)}</span>
                    <div className="w-full bg-orange-500 rounded-t-lg transition-all hover:bg-orange-400" style={{ height: `${Math.max(h, 4)}%` }} />
                    <span className="text-xs text-gray-400">{d._id.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Orders by status */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">📊 Orders by Status</h2>
          {statusPieData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No order data yet</p>
          ) : (
            <div className="space-y-3">
              {statusPieData.map((s) => (
                <MiniBar key={s._id} label={statusLabel[s._id] || s._id} value={s.count} max={maxCount} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">🔥 Top Selling Products</h2>
        {stats.topProducts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No sales yet</p>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-3">
            {stats.topProducts.map((p, i) => (
              <div key={p._id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                <span className="text-lg font-display font-bold text-orange-400">#{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.salesCount} sold</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
