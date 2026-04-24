import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';

const STATUSES = ['all','pending','accepted','preparing','out_for_delivery','delivered','cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/admin/orders${q}&limit=50`);
      setOrders(res.data.orders);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [filter]);

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o._id === orderId ? res.data.order : o));
      toast.success(`Marked as ${statusLabel[status]}`);
    } catch { toast.error('Update failed'); }
    setUpdating(null);
  };

  const totalRevenue = orders.filter((o) => o.status === 'delivered').reduce((s, o) => s + o.totalAmount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-header mb-0">All Orders 📦</h1>
        <button onClick={fetchOrders} className="btn-secondary text-sm py-2">↻ Refresh</button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="stat-card">
          <span className="text-xl">📦</span>
          <p className="text-xl font-display font-bold text-gray-900 dark:text-white">{orders.length}</p>
          <p className="text-xs text-gray-500">Shown Orders</p>
        </div>
        <div className="stat-card">
          <span className="text-xl">⏳</span>
          <p className="text-xl font-display font-bold text-yellow-500">{orders.filter((o) => o.status === 'pending').length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="stat-card">
          <span className="text-xl">💰</span>
          <p className="text-xl font-display font-bold text-green-500">{formatCurrency(totalRevenue)}</p>
          <p className="text-xs text-gray-500">Delivered Revenue</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`flex-shrink-0 capitalize px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === s ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}>
            {s === 'all' ? 'All' : statusLabel[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p>No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order._id} className="card overflow-visible">
              <div className="p-4 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className={`badge ${statusColor[order.status]} text-xs`}>{statusLabel[order.status]}</span>
                    <span className={`badge ${order.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'} text-xs`}>
                      {order.paymentMethod === 'upi' ? '📱 UPI' : '💵 COD'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {order.user?.name} · Room {order.roomNumber} · 📞 {order.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-orange-500">{formatCurrency(order.totalAmount)}</p>
                  <p className="text-xs text-gray-400">{order.items.length} item(s)</p>
                </div>
              </div>

              {expanded === order._id && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4">
                  <div className="space-y-2 mb-4">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                        <span>{item.name} × {item.quantity}</span>
                        <span className="font-semibold">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  {!['delivered','cancelled'].includes(order.status) && (
                    <div className="flex gap-2 flex-wrap">
                      {['accepted','preparing','out_for_delivery','delivered'].map((s) => {
                        const flow = ['pending','accepted','preparing','out_for_delivery','delivered'];
                        if (flow.indexOf(s) <= flow.indexOf(order.status)) return null;
                        if (flow.indexOf(s) > flow.indexOf(order.status) + 1) return null;
                        return (
                          <button key={s} onClick={() => updateStatus(order._id, s)}
                            disabled={updating === order._id}
                            className="btn-primary text-sm py-2 flex-1">
                            {updating === order._id ? 'Updating...' : `Mark ${statusLabel[s]} →`}
                          </button>
                        );
                      })}
                      <button onClick={() => updateStatus(order._id, 'cancelled')} disabled={updating === order._id}
                        className="btn-danger text-sm py-2">Cancel</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
