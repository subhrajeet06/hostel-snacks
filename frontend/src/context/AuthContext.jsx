import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const readStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(readStoredUser);
  const [loading, setLoading] = useState(false);

  // Validate token on app load — if expired/invalid, clear stale session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user) return;

    api.get('/auth/me')
      .then((res) => {
        // Update user data with fresh info from server
        const freshUser = res.data.user;
        const userData = {
          id: freshUser._id,
          name: freshUser.name,
          email: freshUser.email,
          role: freshUser.role,
          phone: freshUser.phone,
          roomNumber: freshUser.roomNumber,
        };
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      })
      .catch(() => {
        // Token is invalid or expired — clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveSession = useCallback((token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      // Registration no longer auto-logs in — user must verify email first.
      toast.success(res.data.message || 'Account created! Check your email to verify.');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      saveSession(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      return { success: true, role: res.data.user.role };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed';
      const requiresVerification = err.response?.data?.requiresVerification || false;

      // Don't show generic toast for verification-required — the LoginPage
      // handles this with a dedicated UI banner.
      if (!requiresVerification) {
        toast.error(msg);
      }
      return { success: false, requiresVerification, error: msg };
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    toast.success('Logged out successfully');
  }, []);

  const forgotPassword = useCallback(async (email) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message || 'Email sent successfully');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send email';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    setLoading(true);
    try {
      const res = await api.put(`/auth/reset-password/${token}`, { password });
      saveSession(res.data.token, res.data.user);
      toast.success('Password reset successfully');
      return { success: true, role: res.data.user.role };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password';
      toast.error(msg);
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  }, [saveSession]);

  const resendVerification = useCallback(async (email) => {
    try {
      const res = await api.post('/auth/resend-verification', { email });
      toast.success(res.data.message || 'Verification email sent!');
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification email';
      toast.error(msg);
      return { success: false, message: msg };
    }
  }, []);

  const updateUser = useCallback((updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    register,
    login,
    logout,
    updateUser,
    forgotPassword,
    resetPassword,
    resendVerification,
  }), [forgotPassword, loading, login, logout, register, resetPassword, resendVerification, updateUser, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
