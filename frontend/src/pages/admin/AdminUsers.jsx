import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const ROLES = ['all','customer','seller','admin'];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [newSeller, setNewSeller] = useState({ name: '', email: '', password: '', phone: '' });
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const pageSize = 50;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (filter !== 'all') q.set('role', filter);
      if (debouncedSearch.trim()) q.set('search', debouncedSearch.trim());
      const res = await api.get(`/admin/users?${q}`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, [debouncedSearch, filter, page]);

  const toggleActive = async (user) => {
    try {
      const res = await api.put(`/admin/users/${user._id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => u._id === user._id ? res.data.user : u));
      toast.success(`${user.name} ${res.data.user.isActive ? 'activated' : 'deactivated'}`);
    } catch { toast.error('Update failed'); }
  };

  const changeRole = async (user, role) => {
    try {
      const res = await api.put(`/admin/users/${user._id}`, { role });
      setUsers((prev) => prev.map((u) => u._id === user._id ? res.data.user : u));
      toast.success(`Role changed to ${role}`);
    } catch { toast.error('Update failed'); }
  };

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const addSeller = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/admin/sellers', newSeller);
      toast.success('Seller account created!');
      setShowAdd(false);
      setNewSeller({ name: '', email: '', password: '', phone: '' });
      setPage(1);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setAdding(false);
  };

  const roleBadge = { customer: 'bg-blue-100 text-blue-700', seller: 'bg-purple-100 text-purple-700', admin: 'bg-orange-100 text-orange-700' };
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header mb-0">Users 👥</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">+ Add Seller</button>
      </div>

      {/* Add seller modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="font-display font-bold text-gray-900 dark:text-white mb-4">Create Seller Account</h2>
            <form onSubmit={addSeller} className="space-y-3">
              <div><label className="label">Name</label><input className="input" value={newSeller.name} onChange={(e) => setNewSeller({...newSeller, name: e.target.value})} required /></div>
              <div><label className="label">Email</label><input className="input" type="email" value={newSeller.email} onChange={(e) => setNewSeller({...newSeller, email: e.target.value})} required /></div>
              <div><label className="label">Password</label><input className="input" type="password" value={newSeller.password} onChange={(e) => setNewSeller({...newSeller, password: e.target.value})} required /></div>
              <div><label className="label">Phone</label><input className="input" value={newSeller.phone} onChange={(e) => setNewSeller({...newSeller, phone: e.target.value})} /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={adding} className="btn-primary flex-1">{adding ? 'Creating...' : 'Create Seller'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ROLES.map((r) => (
            <button key={r} onClick={() => { setFilter(r); setPage(1); }}
              className={`flex-shrink-0 capitalize px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                filter === r ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
              }`}>
              {r === 'all' ? 'All Users' : r}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchUsers(); }} className="flex gap-2 flex-1">
          <input className="input flex-1 text-sm" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <button type="submit" className="btn-secondary px-3 py-2 text-sm">🔍</button>
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['User','Role','Status','Phone','Joined','Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                      {u.roomNumber && <p className="text-xs text-gray-400">Room: {u.roomNumber}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                        className={`badge ${roleBadge[u.role]} text-xs font-semibold cursor-pointer border-0 bg-transparent`}>
                        <option value="customer">customer</option>
                        <option value="seller">seller</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(u)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(u.createdAt).split(',')[0]}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <button onClick={() => deleteUser(u._id, u.name)}
                          className="text-red-400 hover:text-red-600 p-1 rounded transition-all text-xs">🗑️ Delete</button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-5">
          <button disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="btn-secondary text-sm py-2 disabled:opacity-40">Prev</button>
          <span className="flex items-center text-sm text-gray-500">Page {page} of {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="btn-secondary text-sm py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
