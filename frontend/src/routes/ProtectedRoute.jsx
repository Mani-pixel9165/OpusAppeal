import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../common/context/AuthContext';

export default function ProtectedRoute({ adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.first_login_required) return <Navigate to="/update-password" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

