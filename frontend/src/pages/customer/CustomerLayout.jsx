import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import { useState } from 'react';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { dark, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/products', label: 'Menu' },
    ...(user ? [{ to: '/orders', label: 'My Orders' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🍟</span>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">HostelBite</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === link.to
                    ? 'bg-orange-100 text-orange-700 dark:bg-gray-800 dark:text-orange-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button onClick={toggleTheme} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-all">
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Cart */}
            {user?.role === 'customer' && (
              <Link to="/cart" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
                <span className="text-xl">🛒</span>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )}

            {/* User menu */}
            {user ? (
              <div className="relative hidden md:block">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 bg-orange-500 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition-all"
                >
                  <span>👤</span>
                  <span className="hidden md:block">{user.name.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl p-2 min-w-[180px] z-50">
                    <Link to="/profile" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                      ⚙️ Profile
                    </Link>
                    <Link to="/orders" onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                      📦 Orders
                    </Link>
                    <hr className="my-1 border-gray-100 dark:border-gray-800" />
                    <button onClick={() => { logout(); setMenuOpen(false); navigate('/login'); }}
                      className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-red-50 text-sm text-red-600">
                      🚪 Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary py-2 px-4 text-sm hidden md:block">Sign In</Link>
            )}

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              ☰
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
            {/* Overlay */}
            <div 
              className="absolute inset-0 bg-black/60 transition-opacity" 
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Drawer */}
            <div className="relative w-80 max-w-full bg-white dark:bg-[#1a1f26] h-full shadow-2xl flex flex-col transform transition-transform duration-300">
              {/* Header */}
              <div className="p-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍟</span>
                  <span className="font-display font-bold text-xl text-gray-900 dark:text-white">
                    Hostel<span className="text-orange-500">Bite</span>
                  </span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1"
                >
                  <span className="text-2xl font-light">×</span>
                </button>
              </div>

              {/* Profile Card */}
              {user && (
                <div className="p-5">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 flex items-center gap-4 border border-gray-200 dark:border-gray-700/50">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-white font-bold text-lg leading-tight">My Account</p>
                      <Link 
                        to="/profile" 
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-gray-500 dark:text-gray-400 text-sm hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-1 mt-0.5"
                      >
                        View Profile <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Links */}
              <div className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-2">
                <Link 
                  to="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${location.pathname === '/' ? 'bg-orange-50 dark:bg-[#2a2f36] border-l-4 border-orange-500 text-orange-600 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <span className={location.pathname === '/' ? 'text-orange-500' : ''}>🏠</span>
                  <span className="font-semibold">Home</span>
                </Link>

                <Link 
                  to="/products" 
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${location.pathname === '/products' ? 'bg-orange-50 dark:bg-[#2a2f36] border-l-4 border-orange-500 text-orange-600 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  <span className={location.pathname === '/products' ? 'text-orange-500' : ''}>🍔</span>
                  <span className="font-semibold">Menu</span>
                </Link>

                {user && (
                  <Link 
                    to="/orders" 
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${location.pathname === '/orders' ? 'bg-orange-50 dark:bg-[#2a2f36] border-l-4 border-orange-500 text-orange-600 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <span className={location.pathname === '/orders' ? 'text-orange-500' : ''}>📦</span>
                    <span className="font-semibold">My Orders</span>
                  </Link>
                )}
              </div>

              {/* Logout / Login */}
              {user ? (
                <div className="p-5 border-t border-gray-100 dark:border-gray-800">
                  <button 
                    onClick={() => { logout(); setMobileMenuOpen(false); navigate('/login'); }}
                    className="w-full flex items-center gap-4 p-4 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-semibold"
                  >
                    <span>🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="p-5 border-t border-gray-100 dark:border-gray-800">
                  <Link 
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all font-semibold"
                  >
                    <span>🔐</span>
                    <span>Sign In</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 mt-12 py-6 text-center text-sm text-gray-400">
        🍟 HostelBite © 2026 — Fast snack delivery for hostelers
      </footer>
    </div>
  );
}
