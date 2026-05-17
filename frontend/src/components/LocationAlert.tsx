import { useState } from "react";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type Props = {
  loading: boolean;
  isValid: boolean | null;
  error: string | null;
};

const DISMISSED_KEY = "location_alert_dismissed";

const LocationAlert = ({ loading, isValid, error }: Props) => {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const visible = !!isAuthenticated && !dismissed;

  if (!visible) return null;
  if (!loading && !error && isValid === null) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
      {/* MODAL */}
      <div className="bg-white rounded-2xl px-6 py-6 shadow-2xl w-[360px] animate-in fade-in zoom-in duration-200">

        {/* CONTENT */}
        <div className="flex items-center gap-3 mb-4">
          {loading && <Loader2 className="w-6 h-6 animate-spin text-orange-500" />}

          {!loading && isValid === false && (
            <AlertTriangle className="w-6 h-6 text-red-500" />
          )}

          {!loading && isValid === true && (
            <CheckCircle className="w-6 h-6 text-green-500" />
          )}

          <h3 className="text-lg font-bold text-slate-800">
            Thông báo vị trí
          </h3>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          {loading && "Đang xác định vị trí của bạn..."}
          {!loading && error && error}
          {!loading && isValid === false &&
            "Khu vực bạn đang ở chưa được hỗ trợ giao hàng."}
          {!loading && isValid === true &&
            "Vị trí hợp lệ. Bạn có thể đặt món trong khu vực Đà Nẵng."}
        </p>

        {!loading && (
          <button
            onClick={handleDismiss}
            className="w-full h-11 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 transition"
          >
            Đã hiểu
          </button>
        )}
      </div>
    </div>
  );
};

export default LocationAlert;
