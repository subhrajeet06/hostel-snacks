import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Customer Pages
import CustomerLayout from './pages/customer/CustomerLayout';
import HomePage from './pages/customer/HomePage';
import ProductsPage from './pages/customer/ProductsPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderSuccessPage from './pages/customer/OrderSuccessPage';
import OrderHistoryPage from './pages/customer/OrderHistoryPage';
import OrderDetailPage from './pages/customer/OrderDetailPage';
import ProfilePage from './pages/customer/ProfilePage';

// Seller Pages
import SellerLayout from './pages/seller/SellerLayout';
import SellerDashboard from './pages/seller/SellerDashboard';
import SellerProducts from './pages/seller/SellerProducts';
import SellerOrders from './pages/seller/SellerOrders';
import SellerAddProduct from './pages/seller/SellerAddProduct';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminProducts from './pages/admin/AdminProducts';

// Route Guards
const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'admin')  return <Navigate to="/admin"  replace />;
    if (user.role === 'seller') return <Navigate to="/seller" replace />;
    return <Navigate to="/" replace />;
  }
  return children;
};

export default function App() {
  useSocket(); // initialise socket globally

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

      {/* Customer */}
      <Route path="/" element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="cart"     element={<PrivateRoute roles={['customer']}><CartPage /></PrivateRoute>} />
        <Route path="checkout" element={<PrivateRoute roles={['customer']}><CheckoutPage /></PrivateRoute>} />
        <Route path="order-success/:id" element={<PrivateRoute roles={['customer']}><OrderSuccessPage /></PrivateRoute>} />
        <Route path="orders"   element={<PrivateRoute roles={['customer']}><OrderHistoryPage /></PrivateRoute>} />
        <Route path="orders/:id" element={<PrivateRoute roles={['customer']}><OrderDetailPage /></PrivateRoute>} />
        <Route path="profile"  element={<PrivateRoute roles={['customer']}><ProfilePage /></PrivateRoute>} />
      </Route>

      {/* Seller */}
      <Route path="/seller" element={<PrivateRoute roles={['seller']}><SellerLayout /></PrivateRoute>}>
        <Route index element={<SellerDashboard />} />
        <Route path="products"     element={<SellerProducts />} />
        <Route path="products/add" element={<SellerAddProduct />} />
        <Route path="products/edit/:id" element={<SellerAddProduct />} />
        <Route path="orders"       element={<SellerOrders />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminLayout /></PrivateRoute>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users"    element={<AdminUsers />} />
        <Route path="orders"   element={<AdminOrders />} />
        <Route path="products" element={<AdminProducts />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
