import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusLabel } from '../../utils/helpers';

export default function OrderSuccessPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data.order)).catch(() => {});
  }, [id]);

  if (!order) return (
    <div className="flex justify-center py-16"><div className="spinner" /></div>
  );

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      {/* Success animation */}
      <div className="text-8xl mb-4 animate-bounce">🎉</div>
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-8">Your snacks are on their way 🚀</p>

      <div className="card p-6 text-left mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400">Order ID</p>
            <p className="font-mono text-sm font-bold text-gray-900 dark:text-white">#{order._id.slice(-8).toUpperCase()}</p>
          </div>
          <span className={`badge status-${order.status} text-xs font-semibold px-3 py-1.5`}>
            {statusLabel[order.status]}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
              <span>{item.name} × {item.quantity}</span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <hr className="border-gray-100 dark:border-gray-800 mb-4" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-gray-400 text-xs">Room</p><p className="font-semibold dark:text-white">{order.roomNumber}</p></div>
          <div><p className="text-gray-400 text-xs">Phone</p><p className="font-semibold dark:text-white">{order.phoneNumber}</p></div>
          <div><p className="text-gray-400 text-xs">Payment</p><p className="font-semibold uppercase dark:text-white">{order.paymentMethod}</p></div>
          <div><p className="text-gray-400 text-xs">Total</p><p className="font-bold text-orange-500">{formatCurrency(order.totalAmount)}</p></div>
        </div>
      </div>

      {/* Status tracker */}
      <div className="card p-5 mb-6">
        <p className="font-semibold text-gray-900 dark:text-white mb-4 text-left">Order Status</p>
        <div className="space-y-3">
          {[
            { key: 'pending', icon: '📋', label: 'Order Placed' },
            { key: 'accepted', icon: '✅', label: 'Accepted' },
            { key: 'preparing', icon: '👨‍🍳', label: 'Preparing' },
            { key: 'out_for_delivery', icon: '🚴', label: 'Out for Delivery' },
            { key: 'delivered', icon: '🎉', label: 'Delivered' },
          ].map((step, idx) => {
            const steps = ['pending','accepted','preparing','out_for_delivery','delivered'];
            const currentIdx = steps.indexOf(order.status);
            const stepIdx = steps.indexOf(step.key);
            const done = stepIdx <= currentIdx;
            const current = stepIdx === currentIdx;
            return (
              <div key={step.key} className={`flex items-center gap-3 ${done ? 'opacity-100' : 'opacity-30'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                  current ? 'bg-orange-100 ring-2 ring-orange-500' : done ? 'bg-green-100' : 'bg-gray-100'
                }`}>{step.icon}</div>
                <span className={`text-sm font-medium ${current ? 'text-orange-600' : done ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                  {step.label} {current && <span className="text-xs ml-1 animate-pulse">●</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <Link to="/orders" className="btn-secondary flex-1">View All Orders</Link>
        <Link to="/products" className="btn-primary flex-1">Order More 🛍️</Link>
      </div>
    </div>
  );
}
