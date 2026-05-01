import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPasswordPage() {
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await forgotPassword(email);
    if (res.success) {
      setIsSent(true);
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
          <h2 className="font-display text-xl font-bold mb-6 text-gray-900">Forgot Password</h2>

          {isSent ? (
            <div className="text-center space-y-4">
              <div className="text-4xl">✉️</div>
              <h3 className="text-lg font-semibold text-gray-900">Email Sent!</h3>
              <p className="text-sm text-gray-500">
                We've sent a password reset link to <br />
                <span className="font-medium text-gray-900">{email}</span>
              </p>
              <p className="text-sm text-gray-500">
                Please check your inbox and click the link to reset your password.
              </p>
              <Link to="/login" className="btn-primary w-full inline-block mt-4">
                Return to Login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-orange-500 font-semibold hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
