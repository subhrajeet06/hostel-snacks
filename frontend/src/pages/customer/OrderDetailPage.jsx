import { useCallback, useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { formatCurrency, formatDate, statusLabel, statusColor, orderStatusSteps, getStepIndex } from '../../utils/helpers';
import { subscribeSocketEvent } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = useCallback(() =>
    api.get(`/orders/${id}`).then((res) => setOrder(res.data.order)).catch(() => {}).finally(() => setLoading(false)), [id]);

  useEffect(() => {
    fetchOrder();
    return subscribeSocketEvent('order_status_update', ({ orderId, status }) => {
      if (orderId === id || orderId?.toString() === id) {
        setOrder((prev) => prev ? { ...prev, status } : prev);
        toast.success(`Order ${statusLabel[status]}!`);
      }
    });
  }, [fetchOrder, id]);

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      const res = await api.put(`/orders/${id}/cancel`);
      setOrder(res.data.order);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><div className="spinner" /></div>;
  if (!order) return <div className="text-center py-16 text-gray-500">Order not found</div>;

  const currentStepIdx = getStepIndex(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/orders')} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">←</button>
        <h1 className="font-display text-xl font-bold text-gray-900 dark:text-white">
          Order #{order._id.slice(-8).toUpperCase()}
        </h1>
        <span className={`badge ${statusColor[order.status]} ml-auto`}>{statusLabel[order.status]}</span>
      </div>

      {/* Status Stepper */}
      {!isCancelled && (
        <div className="card p-5 mb-4">
          <p className="font-semibold text-gray-800 dark:text-white mb-5 text-sm">Order Progress</p>
          <div className="relative">
            {/* Progress bar */}
            <div className="absolute top-5 left-4 right-4 h-0.5 bg-gray-200 dark:bg-gray-700" />
            <div
              className="absolute top-5 left-4 h-0.5 bg-orange-400 transition-all duration-700"
              style={{ width: `${(currentStepIdx / (orderStatusSteps.length - 1)) * 100}%` }}
            />
            <div className="relative flex justify-between">
              {orderStatusSteps.map((step, idx) => {
                const done = idx <= currentStepIdx;
                const current = idx === currentStepIdx;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 w-16">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg z-10 transition-all ${
                      current ? 'bg-orange-500 ring-4 ring-orange-100 dark:ring-orange-900 shadow-md' :
                      done ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {done && !current ? '✓' : step.icon}
                    </div>
                    <p className={`text-center text-xs leading-tight ${
                      current ? 'font-bold text-orange-600 dark:text-orange-400' :
                      done ? 'text-green-700 dark:text-green-400' : 'text-gray-400'
                    }`}>{step.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-4 text-center">
          <span className="text-2xl">❌</span>
          <p className="text-red-700 dark:text-red-400 font-semibold mt-1">This order was cancelled</p>
        </div>
      )}

      {/* Order Items */}
      <div className="card p-5 mb-4">
        <p className="font-semibold text-gray-800 dark:text-white mb-3 text-sm">Items Ordered</p>
        <div className="space-y-3">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <img src={item.image || `https://via.placeholder.com/60x60?text=${encodeURIComponent(item.name)}`}
                alt={item.name} loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover bg-gray-100" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                <p className="text-xs text-gray-500">{formatCurrency(item.price)} each</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">×{item.quantity}</p>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>
        <hr className="border-gray-100 dark:border-gray-800 my-3" />
        <div className="flex justify-between font-bold text-base text-gray-900 dark:text-white">
          <span>Total</span>
          <span className="text-orange-500">{formatCurrency(order.totalAmount)}</span>
        </div>
      </div>

      {/* Delivery Info */}
      <div className="card p-5 mb-4">
        <p className="font-semibold text-gray-800 dark:text-white mb-3 text-sm">Delivery Details</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-xs text-gray-400">Room</p><p className="font-semibold dark:text-white">{order.roomNumber}</p></div>
          <div><p className="text-xs text-gray-400">Phone</p><p className="font-semibold dark:text-white">{order.phoneNumber}</p></div>
          <div><p className="text-xs text-gray-400">Payment</p><p className="font-semibold uppercase dark:text-white">{order.paymentMethod}</p></div>
          <div><p className="text-xs text-gray-400">Placed at</p><p className="font-semibold dark:text-white text-xs">{formatDate(order.createdAt)}</p></div>
        </div>
        {order.notes && <p className="text-xs text-gray-500 mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2">📝 {order.notes}</p>}
      </div>

      {/* Status History */}
      {order.statusHistory?.length > 0 && (
        <div className="card p-5 mb-4">
          <p className="font-semibold text-gray-800 dark:text-white mb-3 text-sm">Timeline</p>
          <div className="space-y-2">
            {[...order.statusHistory].reverse().map((h, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 text-xs whitespace-nowrap mt-0.5">{formatDate(h.timestamp)}</span>
                <span className={`badge ${statusColor[h.status]} text-xs`}>{statusLabel[h.status]}</span>
                {h.note && <span className="text-gray-500 text-xs">{h.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/orders" className="btn-secondary flex-1">← All Orders</Link>
        {!['delivered','cancelled','out_for_delivery'].includes(order.status) && (
          <button onClick={cancelOrder} disabled={cancelling} className="btn-danger flex-1">
            {cancelling ? 'Cancelling...' : 'Cancel Order'}
          </button>
        )}
      </div>
    </div>
  );
}
