import { useCallback, useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusColor, statusLabel } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { subscribeSocketEvent } from '../../hooks/useSocket';

const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered'];
const FILTERS = ['all', 'pending', 'accepted', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

export default function SellerOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter !== 'all' ? `?status=${filter}` : '';
      const res = await api.get(`/orders/seller/all${q}`);
      setOrders(res.data.orders);
    } catch {}
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    return subscribeSocketEvent('new_order', () => {
      toast.success('New order received!');
      fetchOrders();
    });
  }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    setUpdating(orderId);
    try {
      const res = await api.put(`/orders/${orderId}/status`, { status });
      setOrders((prev) => prev.map((o) => o._id === orderId ? res.data.order : o));
      toast.success(`Order marked as ${statusLabel[status]}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(null);
    }
  };

  const nextStatus = (current) => {
    const idx = STATUS_FLOW.indexOf(current);
    return idx < STATUS_FLOW.length - 1 ? STATUS_FLOW[idx + 1] : null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Orders 📦</h1>
        <button onClick={fetchOrders} className="btn-secondary text-sm py-2">↻ Refresh</button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-shrink-0 capitalize px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === f ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
            }`}>
            {f === 'all' ? 'All' : statusLabel[f]}
            {f !== 'all' && <span className="ml-1 opacity-70">({orders.filter((o) => o.status === f).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-medium">No orders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="card overflow-visible">
              {/* Order header */}
              <div className="p-4 flex items-start gap-3 cursor-pointer"
                onClick={() => setExpanded(expanded === order._id ? null : order._id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-gray-500">#{order._id.slice(-8).toUpperCase()}</span>
                    <span className={`badge ${statusColor[order.status]} text-xs`}>{statusLabel[order.status]}</span>
                    {order.paymentMethod === 'upi' && <span className="badge bg-purple-100 text-purple-700 text-xs">📱 UPI</span>}
                    {order.paymentMethod === 'cod' && <span className="badge bg-gray-100 text-gray-700 text-xs">💵 COD</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                    🏠 Room {order.roomNumber} · 📞 {order.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)} · {order.items.length} item(s)</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-orange-500">{formatCurrency(order.sellerAmount ?? order.totalAmount)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{order.user?.name || 'Customer'}</p>
                </div>
              </div>

              {/* Expanded detail */}
              {expanded === order._id && (
                <div className="border-t border-gray-100 dark:border-gray-800 p-4">
                  {/* Items */}
                  <div className="mb-4 space-y-2">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <img src={item.image || `https://via.placeholder.com/40x40?text=${encodeURIComponent(item.name)}`}
                          alt={item.name} loading="lazy" decoding="async" className="w-10 h-10 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                        <span className="flex-1 text-gray-700 dark:text-gray-300">{item.name} × {item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon & Total Summary for Seller */}
                  {order.sellerDiscount > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Items Subtotal</span>
                        <span>{formatCurrency(order.sellerSubtotal ?? order.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>Coupon Discount {order.couponCode ? `(${order.couponCode})` : ''}</span>
                        <span>−{formatCurrency(order.sellerDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-gray-900 dark:text-white font-bold pt-1 border-t border-gray-200 dark:border-gray-700">
                        <span>Your Earnings (Final)</span>
                        <span className="text-orange-500">{formatCurrency(order.sellerAmount)}</span>
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <p className="text-xs bg-yellow-50 dark:bg-gray-800 text-yellow-800 dark:text-yellow-300 rounded-xl p-2.5 mb-4">
                      📝 Note: {order.notes}
                    </p>
                  )}

                  {/* Action buttons */}
                  {!['delivered', 'cancelled'].includes(order.status) && (
                    <div className="flex gap-2 flex-wrap">
                      {nextStatus(order.status) && (
                        <button
                          onClick={() => updateStatus(order._id, nextStatus(order.status))}
                          disabled={updating === order._id}
                          className="btn-primary text-sm py-2 flex-1"
                        >
                          {updating === order._id ? '⏳ Updating...' : `Mark as ${statusLabel[nextStatus(order.status)]} →`}
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(order._id, 'cancelled')}
                        disabled={updating === order._id}
                        className="btn-danger text-sm py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  {order.status === 'delivered' && (
                    <p className="text-green-600 dark:text-green-400 text-sm font-semibold text-center">✅ Order Delivered!</p>
                  )}
                  {order.status === 'cancelled' && (
                    <p className="text-red-500 text-sm font-semibold text-center">❌ Order Cancelled</p>
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
