import { useState } from "react";
import type { CreateManagerPayload, StoreOption } from "@/types/adminManager";
import { getStoreName } from "@/utils/manager-utils";

interface CreateManagerModalProps {
  open: boolean;
  loading: boolean;
  stores: StoreOption[];
  storesLoading: boolean;
  payload: CreateManagerPayload;
  onChange: (payload: CreateManagerPayload) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  storeId?: string;
}

const validateForm = (payload: CreateManagerPayload): FormErrors => {
  const errors: FormErrors = {};

  if (!payload.storeId) {
    errors.storeId = "Vui lòng chọn cửa hàng.";
  }

  if (!payload.name.trim()) {
    errors.name = "Vui lòng nhập họ và tên.";
  }

  if (!payload.email.trim()) {
    errors.email = "Vui lòng nhập email.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = "Email không hợp lệ.";
  }

  if (!payload.phone.trim()) {
    errors.phone = "Vui lòng nhập số điện thoại.";
  } else if (!/^0\d{9}$/.test(payload.phone.trim())) {
    errors.phone = "Số điện thoại phải gồm 10 số và bắt đầu bằng 0.";
  }

  return errors;
};

const CreateManagerModal = ({
  open,
  loading,
  stores,
  storesLoading,
  payload,
  onChange,
  onClose,
  onSubmit,
}: CreateManagerModalProps) => {
  const [errors, setErrors] = useState<FormErrors>({});

  if (!open) return null;

  const handleChange = (field: keyof CreateManagerPayload, value: string) => {
    onChange({
      ...payload,
      [field]: value,
    });

    setErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(payload);
    setErrors(validationErrors);
    await onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-[#1b140d]">
            Thêm quản lý cửa hàng
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-[#f3ede7] rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-[#1b140d] mb-1">
              Cửa hàng phụ trách
            </label>

            <select
              value={payload.storeId}
              disabled={storesLoading}
              onChange={(e) => handleChange("storeId", e.target.value)}
              className={`w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border text-sm focus:ring-2 focus:ring-[#ee8c2b]/50 ${
                errors.storeId ? "border-red-500" : "border-transparent"
              }`}
            >
              <option value="">
                {storesLoading ? "Đang tải cửa hàng..." : "Chọn cửa hàng"}
              </option>

              {stores.map((store) => (
                <option key={store._id} value={store._id}>
                  {getStoreName(store)}
                </option>
              ))}
            </select>

            {errors.storeId && (
              <p className="mt-1 text-xs text-red-600">{errors.storeId}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-[#1b140d] mb-1">
              Họ và tên
            </label>

            <input
              type="text"
              value={payload.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className={`w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border text-sm focus:ring-2 focus:ring-[#ee8c2b]/50 ${
                errors.name ? "border-red-500" : "border-transparent"
              }`}
            />

            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-[#1b140d] mb-1">
                Email
              </label>

              <input
                type="email"
                value={payload.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                className={`w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border text-sm focus:ring-2 focus:ring-[#ee8c2b]/50 ${
                  errors.email ? "border-red-500" : "border-transparent"
                }`}
              />

              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-[#1b140d] mb-1">
                Số điện thoại
              </label>

              <input
                type="tel"
                value={payload.phone}
                onChange={(e) =>
                  handleChange("phone", e.target.value.replace(/\D/g, ""))
                }
                placeholder="0123456789"
                maxLength={10}
                className={`w-full px-4 py-2.5 rounded-lg bg-[#f3ede7] border text-sm focus:ring-2 focus:ring-[#ee8c2b]/50 ${
                  errors.phone ? "border-red-500" : "border-transparent"
                }`}
              />

              {errors.phone && (
                <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-[#e7dbcf] rounded-lg font-bold text-[#1b140d] hover:bg-[#f3ede7] transition-colors"
            >
              Hủy
            </button>

            <button
              type="submit"
              disabled={loading || storesLoading}
              className="flex-1 px-4 py-3 bg-[#ee8c2b] text-white rounded-lg font-bold hover:bg-[#d87c24] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              Lưu quản lý
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateManagerModal;
