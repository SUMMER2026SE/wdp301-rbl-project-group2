import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const RequireManagerStore = () => {
  const { user } = useAuth();

  if (!user?.storeId) {
    return <Navigate to="/manager/no-store" replace />;
  }

  return <Outlet />;
};

export default RequireManagerStore;
