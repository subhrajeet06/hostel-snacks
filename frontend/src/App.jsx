import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useSocket } from './hooks/useSocket';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage'));

const CustomerLayout = lazy(() => import('./pages/customer/CustomerLayout'));
const HomePage = lazy(() => import('./pages/customer/HomePage'));
const ProductsPage = lazy(() => import('./pages/customer/ProductsPage'));
const CartPage = lazy(() => import('./pages/customer/CartPage'));
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'));
const OrderSuccessPage = lazy(() => import('./pages/customer/OrderSuccessPage'));
const OrderHistoryPage = lazy(() => import('./pages/customer/OrderHistoryPage'));
const OrderDetailPage = lazy(() => import('./pages/customer/OrderDetailPage'));
const ProfilePage = lazy(() => import('./pages/customer/ProfilePage'));

const SellerLayout = lazy(() => import('./pages/seller/SellerLayout'));
const SellerDashboard = lazy(() => import('./pages/seller/SellerDashboard'));
const SellerProducts = lazy(() => import('./pages/seller/SellerProducts'));
const SellerOrders = lazy(() => import('./pages/seller/SellerOrders'));
const SellerAddProduct = lazy(() => import('./pages/seller/SellerAddProduct'));

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));

const getDashboardPath = (role) => {
  if (role === 'admin') return '/admin';
  if (role === 'seller') return '/seller';
  return '/';
};

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="spinner" />
  </div>
);

const PrivateRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return children;
};

const GuestRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to={getDashboardPath(user.role)} replace />;
  return children;
};

const CustomerRoute = ({ children }) => {
  const { user } = useAuth();
  if (user && user.role !== 'customer') {
    return <Navigate to={getDashboardPath(user.role)} replace />;
  }
  return children;
};

export default function App() {
  useSocket();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
        <Route path="/verify-email/:token" element={<VerifyEmailPage />} />

        <Route path="/" element={<CustomerRoute><CustomerLayout /></CustomerRoute>}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="cart" element={<PrivateRoute roles={['customer']}><CartPage /></PrivateRoute>} />
          <Route path="checkout" element={<PrivateRoute roles={['customer']}><CheckoutPage /></PrivateRoute>} />
          <Route path="order-success/:id" element={<PrivateRoute roles={['customer']}><OrderSuccessPage /></PrivateRoute>} />
          <Route path="orders" element={<PrivateRoute roles={['customer']}><OrderHistoryPage /></PrivateRoute>} />
          <Route path="orders/:id" element={<PrivateRoute roles={['customer']}><OrderDetailPage /></PrivateRoute>} />
          <Route path="profile" element={<PrivateRoute roles={['customer']}><ProfilePage /></PrivateRoute>} />
        </Route>

        <Route path="/seller" element={<PrivateRoute roles={['seller']}><SellerLayout /></PrivateRoute>}>
          <Route index element={<SellerDashboard />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="products/add" element={<SellerAddProduct />} />
          <Route path="products/edit/:id" element={<SellerAddProduct />} />
          <Route path="orders" element={<SellerOrders />} />
        </Route>

        <Route path="/admin" element={<PrivateRoute roles={['admin']}><AdminLayout /></PrivateRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
