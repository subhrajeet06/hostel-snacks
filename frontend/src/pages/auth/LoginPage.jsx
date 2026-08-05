import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login, resendVerification, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUnverified(false);
    setError('');
    const res = await login(form.email, form.password);
    if (res.success) {
      if (res.role === 'admin')  navigate('/admin');
      else if (res.role === 'seller') navigate('/seller');
      else navigate('/');
    } else if (res.requiresVerification) {
      setUnverified(true);
    } else {
      setError(res.error || 'Invalid email or password');
    }
  };

  const handleResend = async () => {
    setResending(true);
    await resendVerification(form.email);
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🍟</div>
          <h1 className="font-display text-3xl font-bold text-gray-900">HostelBite</h1>
          <p className="text-gray-500 mt-1 text-sm">Snacks delivered to your room</p>
        </div>

        <div className="card p-8 shadow-xl">
          <h2 className="font-display text-xl font-bold mb-6 text-gray-900">Sign In</h2>

          {unverified && (
            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800 font-medium mb-2">
                📧 Your email is not verified yet. Please check your inbox for the verification link.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-orange-600 font-semibold hover:underline"
              >
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setUnverified(false); }}
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-[10px] text-orange-600 hover:underline font-bold">
                  Forgot Password?
                </Link>
              </div>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-500 font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
