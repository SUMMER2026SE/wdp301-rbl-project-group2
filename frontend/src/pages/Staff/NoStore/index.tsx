import { Building2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const StaffNoStore = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-background rounded-2xl border shadow-sm p-8 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
          <Building2 className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Tài khoản chưa được gán chi nhánh</h1>
          <p className="text-muted-foreground">
            Tài khoản nhân viên của bạn chưa được gán chi nhánh. Vui lòng liên hệ quản lý hoặc admin để được hỗ trợ.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="w-full gap-2">
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </Button>
      </div>
    </div>
  );
};

export default StaffNoStore;
