import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useState } from 'react';

const navItems = [
  { to: '/admin',          label: 'Dashboard', icon: '📊', end: true },
  { to: '/admin/orders',   label: 'Orders',    icon: '📦' },
  { to: '/admin/products', label: 'Products',  icon: '🏪' },
  { to: '/admin/users',    label: 'Users',     icon: '👥' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const Sidebar = () => (
    <aside className="w-64 flex-shrink-0 bg-gray-900 flex flex-col h-full">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🍟</span>
          <div>
            <p className="font-display font-bold text-white text-sm">HostelBite</p>
            <p className="text-xs text-orange-400 font-medium">Admin Panel</p>
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-2.5">
          <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <span className="text-xs bg-orange-500 text-white rounded-full px-2 py-0.5 mt-1 inline-block font-medium">Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-orange-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
            onClick={() => setSidebarOpen(false)}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800 space-y-1">
        <button onClick={toggleTheme}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-all text-sm font-medium w-full">
          <span>{dark ? '☀️' : '🌙'}</span> {dark ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/30 hover:text-red-300 transition-all text-sm font-medium w-full">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <div className="hidden md:flex"><Sidebar /></div>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 max-w-[280px]"><Sidebar /></div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden flex items-center justify-between bg-gray-900 px-4 h-14">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 text-xl">☰</button>
          <span className="font-display font-bold text-white">🍟 Admin</span>
          <div />
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
