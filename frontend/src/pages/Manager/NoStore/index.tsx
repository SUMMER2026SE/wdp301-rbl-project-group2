import { useState } from "react";
import { Building2, LogOut, RefreshCw, PhoneCall, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

const ManagerNoStore = () => {
  const { logout, getUser } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRetry = async () => {
    setChecking(true);
    const toastId = toast.loading("Đang đồng bộ lại thông tin tài khoản...");
    try {
      await getUser();
      toast.success("Đã làm mới thông tin tài khoản!", { id: toastId });
    } catch (error) {
      toast.error("Không thể làm mới thông tin. Vui lòng thử lại sau.", { id: toastId });
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Đăng xuất thành công");
    } catch (error) {
      toast.error("Không thể đăng xuất. Vui lòng tải lại trang.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-100/30 px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-orange-200/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-300/10 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <div className="relative w-full max-w-lg rounded-[2.5rem] bg-white/80 border border-white/60 p-8 text-center shadow-2xl shadow-orange-100/50 backdrop-blur-md animate-in zoom-in-95 duration-500">
        
        {/* Animated Icon Ring */}
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-orange-50 border border-orange-100/50 text-orange-600 shadow-inner group">
          <div className="absolute inset-0 rounded-[2rem] bg-orange-100/50 animate-ping opacity-75" />
          <Building2 className="h-10 w-10 relative z-10 transition-transform group-hover:scale-110" />
        </div>

        {/* Text Details */}
        <h1 className="mt-8 text-2xl font-black text-slate-950 tracking-tight">
          Tài khoản chưa được gán chi nhánh
        </h1>
        <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-500 max-w-sm mx-auto">
          Tài khoản quản lý của bạn hiện chưa được phân phối vào chi nhánh nào. Vui lòng liên hệ với Admin để được gán chi nhánh trước khi truy cập khu vực quản trị.
        </p>

        {/* Informative tips */}
        <div className="mt-6 p-4 rounded-2xl bg-orange-50/40 border border-orange-100/30 text-xs font-bold text-orange-800 flex items-center justify-center gap-2 max-w-xs mx-auto">
          <Sparkles className="w-4 h-4 shrink-0 text-orange-500" />
          Nếu Admin vừa gán, hãy ấn nút Kiểm tra lại!
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            disabled={checking}
            onClick={() => void handleRetry()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 hover:bg-orange-600 px-6 py-3.5 text-sm font-black text-white shadow-md shadow-orange-500/10 transition-all hover:scale-105 active:scale-95 disabled:opacity-60 duration-200"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
            Kiểm tra lại
          </button>
          
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3.5 text-sm font-black text-slate-600 hover:text-slate-950 shadow-sm transition-all hover:scale-105 active:scale-95 duration-200"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>

        {/* Footer Support Info */}
        <div className="mt-8 border-t border-slate-100 pt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Hotline hỗ trợ kỹ thuật: 1900 xxxx (Admin)</span>
        </div>
      </div>
    </div>
  );
};

export default ManagerNoStore;
