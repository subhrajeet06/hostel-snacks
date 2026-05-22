import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const UPI_ID = 'hostelbite@upi'; // change to real UPI ID
const QR_CODE_URL = '/qr-code.png'; // local QR code image in public folder
const COUPONS = { HOSTEL10: 0.10, FIRST20: 0.20 };

export default function CheckoutPage() {
  const { cart, resetCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    roomNumber: user?.roomNumber || '',
    phoneNumber: user?.phone || '',
    paymentMethod: 'cod',
    upiTransactionId: '',
    notes: '',
    couponCode: '',
  });
  const [couponApplied, setCouponApplied] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);

  if (!cart.items.length) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🛒</div>
        <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">Your cart is empty</p>
        <Link to="/products" className="btn-primary inline-flex">Browse Menu</Link>
      </div>
    );
  }

  const discount = couponApplied ? cart.totalAmount * COUPONS[couponApplied] : 0;
  const finalAmount = cart.totalAmount - discount;

  const applyCoupon = () => {
    const code = form.couponCode.toUpperCase().trim();
    if (COUPONS[code]) {
      setCouponApplied(code);
      toast.success(`Coupon ${code} applied! 🎉`);
    } else {
      toast.error('Invalid coupon code');
    }
  };

  const placeOrder = async () => {
    if (!form.roomNumber.trim()) return toast.error('Please enter your room number');
    if (!form.phoneNumber.trim()) return toast.error('Please enter your phone number');
    if (form.paymentMethod === 'upi' && !form.upiTransactionId.trim()) {
      return toast.error('Please enter UPI transaction ID');
    }

    setLoading(true);
    try {
      const res = await api.post('/orders', {
        roomNumber: form.roomNumber,
        phoneNumber: form.phoneNumber,
        paymentMethod: form.paymentMethod,
        upiTransactionId: form.upiTransactionId,
        notes: form.notes,
        couponCode: couponApplied || '',
      });
      toast.success('Order placed! 🎉');
      resetCart();
      navigate(`/order-success/${res.data.order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-6">Checkout 🛍️</h1>

      <div className="space-y-4">
        {/* Delivery details */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">📍 Delivery Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Room Number *</label>
              <input className="input" placeholder="e.g. A-201" value={form.roomNumber}
                onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} required />
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input className="input" type="tel" placeholder="9876543210" value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Special Instructions</label>
            <textarea className="input resize-none" rows={2} placeholder="Any special requests..." value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        {/* Payment method */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">💳 Payment Method</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'cod', icon: '💵', label: 'Cash on Delivery', sub: 'Pay when delivered' },
              { value: 'upi', icon: '📱', label: 'UPI Payment',       sub: 'Pay via UPI' },
            ].map((opt) => (
              <label key={opt.value}
                className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  form.paymentMethod === opt.value
                    ? 'border-orange-500 bg-orange-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <input type="radio" name="payment" value={opt.value} checked={form.paymentMethod === opt.value}
                  onChange={(e) => { setForm({ ...form, paymentMethod: e.target.value }); setShowQR(false); }} className="mt-1" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{opt.icon}</span>
                    <span className="font-semibold text-sm text-gray-900 dark:text-white">{opt.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.sub}</p>
                </div>
              </label>
            ))}
          </div>

          {/* UPI section */}
          {form.paymentMethod === 'upi' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-gray-700">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">UPI Payment Details</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-center flex-1">
                  <p className="text-xs text-gray-500 mb-1">UPI ID</p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{UPI_ID}</p>
                </div>
                <button onClick={() => setShowQR(!showQR)}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium hover:border-orange-300 transition-all">
                  {showQR ? 'Hide' : '📷 QR Code'}
                </button>
              </div>
              {showQR && (
                <div className="flex justify-center mb-3">
                  <div className="bg-white p-3 rounded-xl border border-gray-200 text-center">
                    <img src={QR_CODE_URL} alt="Scan to pay" loading="lazy" decoding="async" className="w-32 h-32 rounded-lg object-cover" />
                    <p className="text-xs text-gray-500 mt-2">Scan to pay</p>
                  </div>
                </div>
              )}
              <div>
                <label className="label">UPI Transaction ID *</label>
                <input className="input" placeholder="e.g. 423456789012" value={form.upiTransactionId}
                  onChange={(e) => setForm({ ...form, upiTransactionId: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Enter the 12-digit transaction ID from your UPI app</p>
              </div>
            </div>
          )}
        </div>

        {/* Coupon */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">🎟️ Coupon Code</h2>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Enter code (HOSTEL10, FIRST20)" value={form.couponCode}
              onChange={(e) => { setForm({ ...form, couponCode: e.target.value }); setCouponApplied(null); }} />
            <button onClick={applyCoupon} className="btn-secondary px-4 flex-shrink-0">Apply</button>
          </div>
          {couponApplied && (
            <p className="text-sm text-green-600 font-medium mt-2">✅ {couponApplied} applied — {COUPONS[couponApplied] * 100}% off!</p>
          )}
        </div>

        {/* Order summary */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">🧾 Order Summary</h2>
          <div className="space-y-2 text-sm mb-4">
            {cart.items.map((item) => (
              <div key={item.product?._id} className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{item.product?.name} × {item.quantity}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
            <hr className="border-gray-100 dark:border-gray-800 my-2" />
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span><span>{formatCurrency(cart.totalAmount)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({couponApplied})</span><span>−{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Delivery</span><span className="text-green-500 font-medium">FREE</span>
            </div>
            <hr className="border-gray-100 dark:border-gray-800 my-2" />
            <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white">
              <span>Total</span>
              <span className="text-orange-500">{formatCurrency(finalAmount)}</span>
            </div>
          </div>

          <button onClick={placeOrder} disabled={loading} className="btn-primary w-full text-base py-3">
            {loading ? '⏳ Placing Order...' : `Place Order — ${formatCurrency(finalAmount)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
