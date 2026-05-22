import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusLabel, statusColor } from '../../utils/helpers';
import { subscribeSocketEvent } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = () => {
    api.get('/orders/my').then((res) => setOrders(res.data.orders)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
    return subscribeSocketEvent('order_status_update', ({ orderId, status }) => {
      setOrders((prev) => prev.map((o) => o._id === orderId ? { ...o, status } : o));
      toast.success(`Order ${statusLabel[status]}!`);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;

  if (!orders.length) {
    return (
      <div className="text-center py-20">
        <div className="text-7xl mb-4">📦</div>
        <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">No orders yet</h2>
        <p className="text-gray-500 mb-6">Time to treat yourself!</p>
        <Link to="/products" className="btn-primary inline-flex">Order Now 🍟</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">📦 My Orders</h1>
      <div className="space-y-3">
        {orders.map((order) => (
          <Link key={order._id} to={`/orders/${order._id}`} className="block card p-4 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-mono text-xs text-gray-400">#{order._id.slice(-8).toUpperCase()}</p>
                <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                  {order.items.length} item{order.items.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(order.createdAt)}</p>
              </div>
              <div className="text-right">
                <span className={`badge ${statusColor[order.status]} text-xs font-semibold px-2.5 py-1`}>
                  {statusLabel[order.status]}
                </span>
                <p className="font-bold text-orange-500 mt-1">{formatCurrency(order.totalAmount)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 truncate">
              {order.items.map((i) => i.name).join(', ')}
            </p>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>🏠 Room {order.roomNumber}</span>
              <span className="uppercase">{order.paymentMethod}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
