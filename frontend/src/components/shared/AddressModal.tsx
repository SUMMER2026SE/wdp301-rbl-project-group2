import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AuthAddress } from "@/store/authStore";
import {
  ALL_DELIVERABLE_DISTRICTS,
  DELIVERABLE_CITY,
} from "@/utils/shipping";

const OTHER_CITY = "Khác";
const CITY_OPTIONS = [DELIVERABLE_CITY, OTHER_CITY];

export type AddressLabel = "home" | "work" | "other";

export const LABEL_OPTIONS: { value: AddressLabel; text: string; icon: string }[] = [
  { value: "home", text: "Nhà", icon: "home" },
  { value: "work", text: "Cơ quan", icon: "work" },
  { value: "other", text: "Khác", icon: "fitness_center" },
];

export const LABEL_ICON_BG: Record<AddressLabel, string> = {
  home: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  work: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  other: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
};

interface AddressForm {
  label: AddressLabel;
  receiver_name: string;
  phone: string;
  detail: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

const EMPTY_FORM: AddressForm = {
  label: "home",
  receiver_name: "",
  phone: "",
  detail: "",
  ward: "",
  district: "",
  city: "",
  isDefault: false,
};

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: AuthAddress) => Promise<void>;
  initialData?: AuthAddress | null;
  isFirstAddress?: boolean; // if true, forces the default checkbox to be checked
}

export const AddressModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isFirstAddress = false,
}: AddressModalProps) => {
  const { t } = useTranslation(["customer", "common"]);
  const [form, setForm] = useState<AddressForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          label: (initialData.label as AddressLabel) ?? "home",
          receiver_name: initialData.receiver_name ?? "",
          phone: initialData.phone ?? "",
          detail: initialData.detail ?? "",
          ward: initialData.ward ?? "",
          district: initialData.district ?? "",
          city: initialData.city ?? "",
          isDefault: initialData.isDefault ?? false,
        });
      } else {
        setForm({ ...EMPTY_FORM, isDefault: isFirstAddress });
      }
      setError(null);
    }
  }, [isOpen, initialData, isFirstAddress]);

  if (!isOpen) return null;

  const setField = <K extends keyof AddressForm>(key: K, val: AddressForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.receiver_name.trim()) {
      setError("Vui lòng nhập tên người nhận");
      return;
    }
    if (!form.phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }
    if (!form.detail.trim()) {
      setError("Vui lòng nhập địa chỉ chi tiết");
      return;
    }
    if (!form.district.trim()) {
      setError("Vui lòng nhập quận/huyện");
      return;
    }
    if (!form.city.trim()) {
      setError("Vui lòng nhập thành phố");
      return;
    }

    const newAddr: AuthAddress = {
      label: form.label,
      receiver_name: form.receiver_name.trim(),
      phone: form.phone.trim(),
      detail: form.detail.trim(),
      ward: form.ward.trim(),
      district: form.district.trim(),
      city: form.city.trim(),
      isDefault: form.isDefault,
    };

    try {
      setSaving(true);
      setError(null);
      await onSave(newAddr);
    } catch (err: any) {
      setError(err?.message ?? "Lưu địa chỉ thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={!saving ? onClose : undefined} />
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-border animate-in zoom-in-95 fade-in duration-200">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground">
              {initialData ? "Chỉnh sửa địa chỉ" : t("customer:addresses.addNewAddress")}
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <p className="text-red-500 text-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </p>
            )}

            {/* Label type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t("customer:addresses.addressType")}
              </label>
              <div className="flex gap-2">
                {LABEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setField("label", opt.value)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.label === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {opt.icon}
                    </span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Receiver name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Tên người nhận *
                </label>
                <input
                  type="text"
                  value={form.receiver_name}
                  onChange={(e) => setField("receiver_name", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0901234567"
                  className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Ward / District / City — cascaded dropdowns */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Thành phố *
              </label>
              <select
                value={form.city}
                onChange={(e) => {
                  setField("city", e.target.value);
                  setField("district", "");
                  setField("ward", "");
                }}
                className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Chọn thành phố --</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c === OTHER_CITY ? "" : c}>
                    {c}
                  </option>
                ))}
              </select>
              {form.city && form.city !== DELIVERABLE_CITY && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">block</span>
                  Hiện chỉ giao hàng trong khu vực Đà Nẵng
                </p>
              )}
            </div>

            {form.city === DELIVERABLE_CITY && (
              <>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Khu vực (Phường/Xã cấp cao) *
                  </label>
                  <select
                    value={form.district}
                    onChange={(e) => {
                      setField("district", e.target.value);
                      setField("ward", "");
                    }}
                    className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Chọn khu vực --</option>
                    {ALL_DELIVERABLE_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Detail Address comes LAST */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Địa chỉ chi tiết (số nhà, tên đường) *
              </label>
              <input
                type="text"
                value={form.detail}
                onChange={(e) => setField("detail", e.target.value)}
                placeholder="123 Đường Lê Lợi"
                className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Set default */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => setField("isDefault", e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                {t("customer:addresses.setDefault")}
              </span>
            </label>
          </div>

          <div className="bg-muted/50 px-6 py-4 flex flex-row-reverse gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && (
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
              )}
              {t("customer:addresses.saveAddress")}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex justify-center rounded-lg bg-background px-5 py-2.5 text-sm font-semibold text-foreground border border-border hover:bg-accent transition-colors disabled:opacity-60"
            >
              {t("common:actions.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
