import { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { AuthAddress } from "@/store/authStore";
import { DELIVERABLE_WARDS, DELIVERABLE_CITY } from "@/utils/shipping";
import { isValidPhone, normalizePhone } from "@/utils/address";
import {
  canSearchAddressSuggestions,
  resolveAddressSuggestionDetails,
  searchAddressSuggestionsForAddress,
  type AddressSuggestion,
} from "@/utils/geocoding";

const OTHER_CITY = "Khác";
const CITY_OPTIONS = [DELIVERABLE_CITY, OTHER_CITY];

const normalizeWardLookupText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\b(phuong|xa)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const findWardFromSuggestion = (suggestion: AddressSuggestion) => {
  const haystack = normalizeWardLookupText(
    [
      suggestion.ward,
      suggestion.detail,
      suggestion.secondary,
      suggestion.label,
    ].join(" "),
  );

  return [...DELIVERABLE_WARDS]
    .sort((a, b) => b.length - a.length)
    .find((ward) => {
      const normalizedWard = normalizeWardLookupText(ward);
      return haystack.split(" ").join(" ").includes(normalizedWard);
    });
};

export type AddressLabel = "home" | "work" | "other";

export const LABEL_OPTIONS: {
  value: AddressLabel;
  text: string;
  icon: string;
}[] = [
  { value: "home", text: "Nhà", icon: "home" },
  { value: "work", text: "Cơ quan", icon: "work" },
  { value: "other", text: "Khác", icon: "fitness_center" },
];

export const LABEL_ICON_BG: Record<AddressLabel, string> = {
  home: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
  work: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  other:
    "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
};

interface AddressForm {
  label: AddressLabel;
  receiverName: string;
  phone: string;
  detail: string;
  ward: string;
  city: string;
  isDefault: boolean;
  latitude?: number;
  longitude?: number;
}

const EMPTY_FORM: AddressForm = {
  label: "home",
  receiverName: "",
  phone: "",
  detail: "",
  ward: "",
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
  const [addressSuggestions, setAddressSuggestions] = useState<
    AddressSuggestion[]
  >([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [isAddressInputFocused, setIsAddressInputFocused] = useState(false);
  const [hasAddressSuggestionMiss, setHasAddressSuggestionMiss] =
    useState(false);
  const [selectedSuggestionDetail, setSelectedSuggestionDetail] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setForm({
          label: (initialData.label as AddressLabel) ?? "home",
          receiverName: initialData.receiverName ?? "",
          phone: initialData.phone ?? "",
          detail: initialData.detail ?? "",
          ward: initialData.ward ?? "",
          city: initialData.city ?? "",
          isDefault: initialData.isDefault ?? false,
          latitude: initialData.latitude,
          longitude: initialData.longitude,
        });
      } else {
        setForm({ ...EMPTY_FORM, isDefault: isFirstAddress });
      }
      setError(null);
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setIsAddressInputFocused(false);
      setHasAddressSuggestionMiss(false);
      setSelectedSuggestionDetail(initialData?.detail ?? "");
    }
  }, [isOpen, initialData, isFirstAddress]);

  const setField = <K extends keyof AddressForm>(
    key: K,
    val: AddressForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const previewAddress = useMemo<Partial<AuthAddress>>(
    () => ({
      detail: form.detail,
      ward: form.ward,
      city: form.city,
      latitude: form.latitude,
      longitude: form.longitude,
    }),
    [form.city, form.detail, form.latitude, form.longitude, form.ward],
  );
  useEffect(() => {
    if (
      !isOpen ||
      !form.city.trim() ||
      form.detail.trim() === selectedSuggestionDetail ||
      !canSearchAddressSuggestions(previewAddress)
    ) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      setShowAddressSuggestions(false);
      setHasAddressSuggestionMiss(false);
      return;
    }

    const controller = new AbortController();
    setIsSearchingAddress(true);
    setHasAddressSuggestionMiss(false);

    searchAddressSuggestionsForAddress(previewAddress, controller.signal, 5)
      .then((suggestions) => {
        setAddressSuggestions(suggestions);
        setHasAddressSuggestionMiss(suggestions.length === 0);
        setShowAddressSuggestions(
          isAddressInputFocused && canSearchAddressSuggestions(previewAddress),
        );
      })
      .catch((err) => {
        if ((err as DOMException).name === "AbortError") return;
        setAddressSuggestions([]);
        setHasAddressSuggestionMiss(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSearchingAddress(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    form.city,
    form.detail,
    isAddressInputFocused,
    isOpen,
    previewAddress,
    selectedSuggestionDetail,
  ]);

  const handleChooseAddressSuggestion = async (
    suggestion: AddressSuggestion,
  ) => {
    const resolvedSuggestion = await resolveAddressSuggestionDetails(
      suggestion,
    ).catch(() => suggestion);
    const suggestedWard = findWardFromSuggestion(resolvedSuggestion);

    const nextDetail = resolvedSuggestion.detail || resolvedSuggestion.label;

    setForm((prev) => ({
      ...prev,
      detail: nextDetail,
      ward:
        prev.city === DELIVERABLE_CITY && suggestedWard
          ? suggestedWard
          : prev.ward,
      latitude: resolvedSuggestion.coordinates?.lat,
      longitude: resolvedSuggestion.coordinates?.lng,
    }));
    setSelectedSuggestionDetail(nextDetail.trim());
    setIsAddressInputFocused(false);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setHasAddressSuggestionMiss(false);
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.receiverName.trim()) {
      setError("Vui lòng nhập tên người nhận");
      return;
    }
    if (!form.phone.trim()) {
      setError("Vui lòng nhập số điện thoại");
      return;
    }
    if (!isValidPhone(form.phone)) {
      setError("Số điện thoại không hợp lệ (VD: 0901234567 hoặc +84901234567)");
      return;
    }
    if (!form.detail.trim()) {
      setError("Vui lòng nhập địa chỉ chi tiết");
      return;
    }
    // Ward chỉ bắt buộc khi chọn Thành phố Đà Nẵng
    if (form.city === DELIVERABLE_CITY && !form.ward.trim()) {
      setError("Vui lòng chọn phường/xã");
      return;
    }
    if (!form.city.trim() || form.city === OTHER_CITY) {
      setError("Vui lòng chọn thành phố");
      return;
    }

    const newAddr: AuthAddress = {
      label: form.label || "home",
      receiverName: form.receiverName.trim(),
      phone: normalizePhone(form.phone),
      detail: form.detail.trim(),
      // Nếu không phải Đà Nẵng thì ward không có dropdown, dùng city làm giá trị placeholder
      ward:
        form.city === DELIVERABLE_CITY ? form.ward.trim() : form.city.trim(),
      city: form.city.trim(),
      isDefault: form.isDefault,
      ...(Number.isFinite(form.latitude) && Number.isFinite(form.longitude)
        ? { latitude: form.latitude, longitude: form.longitude }
        : {}),
    };

    try {
      setSaving(true);
      setError(null);
      await onSave(newAddr);
    } catch (err: any) {
      const apiMsg =
        err?.response?.data?.message ??
        err?.response?.data?.errors?.[0]?.message;
      setError(
        apiMsg ?? err?.message ?? "Lưu địa chỉ thất bại. Vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={!saving ? onClose : undefined}
      />
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-card text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-border animate-in zoom-in-95 fade-in duration-200">
          <div className="px-6 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-lg font-bold text-foreground">
              {initialData
                ? "Chỉnh sửa địa chỉ"
                : t("customer:addresses.addNewAddress")}
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
                  value={form.receiverName}
                  onChange={(e) => setField("receiverName", e.target.value)}
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
                  setForm((prev) => ({
                    ...prev,
                    city: e.target.value,
                    ward: "",
                    latitude: undefined,
                    longitude: undefined,
                  }));
                  setSelectedSuggestionDetail("");
                  setShowAddressSuggestions(false);
                  setIsAddressInputFocused(false);
                }}
                className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">-- Chọn thành phố --</option>
                {CITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {form.city && form.city !== DELIVERABLE_CITY && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">
                    block
                  </span>
                  Hiện chỉ giao hàng trong khu vực Đà Nẵng
                </p>
              )}
            </div>

            {form.city === DELIVERABLE_CITY && (
              <>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Phường/Xã *
                  </label>
                  <select
                    value={form.ward}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        ward: e.target.value,
                        latitude: undefined,
                        longitude: undefined,
                      }))
                    }
                    onFocus={() => setSelectedSuggestionDetail("")}
                    onBlur={() => setShowAddressSuggestions(false)}
                    className="block w-full rounded-lg border border-input py-2 px-3 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Chọn phường/xã --</option>
                    {DELIVERABLE_WARDS.map((ward) => (
                      <option key={ward} value={ward}>
                        {ward}
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
              <div className="relative">
                <input
                  type="text"
                  value={form.detail}
                  onFocus={() => {
                    setIsAddressInputFocused(true);
                    setShowAddressSuggestions(
                      canSearchAddressSuggestions(previewAddress),
                    );
                  }}
                  onBlur={() => {
                    window.setTimeout(() => {
                      setIsAddressInputFocused(false);
                      setShowAddressSuggestions(false);
                    }, 120);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsAddressInputFocused(false);
                      setShowAddressSuggestions(false);
                    }
                  }}
                  onChange={(e) => {
                    const nextAddress = {
                      ...previewAddress,
                      detail: e.target.value,
                    };
                    setShowAddressSuggestions(
                      canSearchAddressSuggestions(nextAddress),
                    );
                    setForm((prev) => ({
                      ...prev,
                      detail: e.target.value,
                      latitude: undefined,
                      longitude: undefined,
                    }));
                    setSelectedSuggestionDetail("");
                  }}
                  placeholder="nhập địa chỉ chi tiết"
                  className="block w-full rounded-lg border border-input py-2 px-3 pr-9 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {isAddressInputFocused &&
                  showAddressSuggestions &&
                  addressSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
                      {addressSuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() =>
                            handleChooseAddressSuggestion(suggestion)
                          }
                          className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                        >
                          <span className="material-symbols-outlined mt-0.5 text-[18px] text-orange-600">
                            location_on
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {suggestion.detail || suggestion.label}
                            </span>
                            {suggestion.secondary && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {suggestion.secondary}
                              </span>
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                {isAddressInputFocused &&
                  showAddressSuggestions &&
                  !isSearchingAddress &&
                  hasAddressSuggestionMiss && (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700 shadow-lg dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                      Không tìm thấy địa chỉ này. Hãy nhập rõ số nhà, tên đường
                      hoặc chọn một địa điểm gần đó.
                    </div>
                  )}
              </div>
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
