import React from "react";

interface ConfirmModalProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title = "Xác nhận",
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Huỷ",
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999]">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 px-4">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-[#e7dbcf]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm text-slate-600">{message}</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-12 rounded-2xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-[#ee8c2b] px-5 text-sm font-semibold text-white hover:bg-[#d87c24] disabled:opacity-50"
            >
              {isLoading ? "Đang xử lý..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
