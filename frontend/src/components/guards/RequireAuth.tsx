import { useEffect, useState, useRef } from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

/**
 * Route guard that ensures user is authenticated.
 * Wraps protected routes — redirects to /login if not authenticated.
 * 
 * Usage in App.tsx:
 * ```tsx
 * <Route element={<RequireAuth />}>
 *   <Route path="/profile" element={<ProfilePage />} />
 * </Route>
 * ```
 */
const RequireAuth = () => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();
    const { toast } = useToast();
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const hasWarnedRef = useRef(false);

    useEffect(() => {
        if (!isAuthenticated && !hasWarnedRef.current) {
            hasWarnedRef.current = true;
            toast('Bạn cần đăng nhập để tiếp tục.', 'warning');

            const timer = setTimeout(() => {
                setShouldRedirect(true);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [isAuthenticated, toast]);

    if (isAuthenticated) {
        return <Outlet />;
    }

    if (shouldRedirect) {
        // Redirect to login, preserving the intended destination
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-700">
            <div className="rounded-2xl bg-white px-6 py-4 shadow-md border border-orange-100 text-center max-w-sm mx-4">
                <p className="font-semibold mb-1">Bạn cần đăng nhập để tiếp tục</p>
                <p className="text-sm text-gray-500">
                    Đang chuyển đến trang đăng nhập...
                </p>
            </div>
        </div>
    );
};

export default RequireAuth;
