import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    const res = await resetPassword(token, password);
    if (res.success) {
      if (res.role === 'admin') navigate('/admin');
      else if (res.role === 'seller') navigate('/seller');
      else navigate('/');
    }
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
          <h2 className="font-display text-xl font-bold mb-6 text-gray-900">Reset Password</h2>

          <p className="text-sm text-gray-500 mb-6">
            Enter your new password below to reset your account password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-orange-500 font-semibold hover:underline">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
