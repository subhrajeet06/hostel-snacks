import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);
const emptyCart = { items: [], totalAmount: 0, totalItems: 0 };

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const userRole = user?.role;
  const [cart, setCart] = useState(emptyCart);
  const [loadingCart, setLoadingCart] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!userId || userRole !== 'customer') {
      setCart(emptyCart);
      return;
    }

    try {
      setLoadingCart(true);
      const res = await api.get('/cart');
      setCart(res.data.cart);
    } catch {
      // Cart is non-critical; keep current optimistic state if a refresh fails.
    } finally {
      setLoadingCart(false);
    }
  }, [userId, userRole]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addToCart = useCallback(async (productId, quantity = 1) => {
    try {
      const res = await api.post('/cart/add', { productId, quantity });
      setCart(res.data.cart);
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add to cart');
    }
  }, []);

  const updateQuantity = useCallback(async (productId, quantity) => {
    try {
      const res = await api.put('/cart/update', { productId, quantity });
      setCart(res.data.cart);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  }, []);

  const removeFromCart = useCallback(async (productId) => {
    try {
      const res = await api.delete(`/cart/remove/${productId}`);
      setCart(res.data.cart);
      toast.success('Removed from cart');
    } catch {
      toast.error('Could not remove item');
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await api.delete('/cart/clear');
      setCart(emptyCart);
    } catch {
      // No-op: checkout/order completion can still proceed after backend clears.
    }
  }, []);

  const resetCart = useCallback(() => {
    setCart(emptyCart);
  }, []);

  const cartCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const value = useMemo(() => ({
    cart,
    loadingCart,
    cartCount,
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    resetCart,
  }), [addToCart, cart, cartCount, clearCart, fetchCart, loadingCart, removeFromCart, resetCart, updateQuantity]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
};
