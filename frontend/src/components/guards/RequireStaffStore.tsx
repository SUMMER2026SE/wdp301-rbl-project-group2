import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const RequireStaffStore = () => {
  const { hasAssignedStore } = useAuth();

  if (!hasAssignedStore) {
    return <Navigate to="/staff/no-store" replace />;
  }

  return <Outlet />;
};

export default RequireStaffStore;
