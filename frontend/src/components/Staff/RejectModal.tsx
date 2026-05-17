import { useState } from "react";
import { AlertTriangle, Check, Loader2 } from "lucide-react";

const REJECTION_REASONS = [
  "Hết nguyên liệu món ăn",
  "Cửa hàng đang quá tải",
  "Địa chỉ giao hàng quá xa",
  "Thông tin khách hàng không chính xác",
  "Cửa hàng chuẩn bị đóng cửa",
  "Khác"
];

interface RejectModalProps {
  isOpen: boolean;
  orderCode: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export default function RejectModal({
  isOpen,
  orderCode,
  onConfirm,
  onClose,
  isLoading,
}: RejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalReason = rejectionReason === "Khác" ? customReason : rejectionReason;
    if (!finalReason) return;
    onConfirm(finalReason);
  };

  const handleClose = () => {
    if (isLoading) return;
    setRejectionReason("");
    setCustomReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 pt-8 pb-4">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-6 mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900 text-center mb-2">Từ chối đơn hàng?</h3>
          <p className="text-slate-500 text-center text-sm mb-6">
            Đang xử lý đơn: <span className="font-bold">#{orderCode}</span>. 
            Vui lòng chọn lý do để thông báo cho khách hàng.
          </p>

          <div className="space-y-2 mb-6">
            {REJECTION_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setRejectionReason(reason)}
                className={`w-full p-4 rounded-xl border-2 text-left text-sm font-bold transition-all flex items-center justify-between ${
                  rejectionReason === reason
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                {reason}
                {rejectionReason === reason && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>

          {rejectionReason === "Khác" && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full p-4 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-medium focus:border-orange-500 focus:ring-0 mb-6 resize-none"
              rows={3}
            />
          )}

          <div className="flex gap-3 pb-4">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || !rejectionReason || (rejectionReason === "Khác" && !customReason)}
              className="flex-[1.5] py-4 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl shadow-lg shadow-rose-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Xác nhận từ chối
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
