import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(form.email, form.password);
    if (res.success) {
      if (res.role === 'admin')  navigate('/admin');
      else if (res.role === 'seller') navigate('/seller');
      else navigate('/');
    }
  };

  // const fillDemo = (email, password) => setForm({ email, password });

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline">
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

          {/* Demo credentials - COMMENTED OUT
          <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <p className="text-xs font-semibold text-orange-700 mb-2">🧪 Demo Credentials</p>
            <div className="space-y-1.5">
              {[
                { label: 'Customer', email: 'student@hostel.com', pwd: 'Student@123' },
                { label: 'Seller',   email: 'seller@hostel.com',  pwd: 'Seller@123'  },
                { label: 'Admin',    email: 'admin@hostel.com',   pwd: 'Admin@123'   },
              ].map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => fillDemo(d.email, d.pwd)}
                  className="w-full text-left text-xs bg-white rounded-lg px-3 py-2 border border-orange-100 hover:border-orange-300 hover:bg-orange-50 transition-all"
                >
                  <span className="font-semibold text-orange-600">{d.label}</span>
                  <span className="text-gray-500 ml-2">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
          */}
        </div>
      </div>
    </div>
  );
}
