import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/store/authStore';

interface RequireRoleProps {
    allowedRoles: UserRole[];
}

/**
 * Route guard that checks user role.
 * Must be nested inside <RequireAuth /> (assumes user is authenticated).
 * 
 * Usage in App.tsx:
 * ```tsx
 * <Route element={<RequireAuth />}>
 *   <Route element={<RequireRole allowedRoles={['admin']} />}>
 *     <Route path="/admin" element={<AdminLayout />} />
 *   </Route>
 * </Route>
 * ```
 */
const RequireRole = ({ allowedRoles }: RequireRoleProps) => {
    const { role } = useAuth();

    if (!role || !allowedRoles.includes(role)) {
        // Redirect to 403 Forbidden page if role doesn't match
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
};

export default RequireRole;
