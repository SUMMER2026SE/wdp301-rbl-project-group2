import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import type { AuthAddress } from "@/store/authStore";
import { userService } from "@/services/profile.service";
import { AddressModal, LABEL_OPTIONS, LABEL_ICON_BG } from "@/components/shared/AddressModal";
import type { AddressLabel } from "@/components/shared/AddressModal";

// ────────────────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────────────────

const AddressesPage = () => {
  const { t } = useTranslation(["customer", "common"]);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  // Local copy of addresses for display; synced from authStore
  const [addresses, setAddresses] = useState<AuthAddress[]>(
    user?.addresses ?? [],
  );

  // Keep in sync if authStore changes (e.g. from another tab or getUser call)
  useEffect(() => {
    setAddresses(user?.addresses ?? []);
  }, [user?.addresses]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null); // null = add mode
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Save addresses to BE, update authStore ────────────────────────────────
  const persistAddresses = async (updated: AuthAddress[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await userService.updateMe({ addresses: updated });
      // BE returns the full updated user — sync authStore so checkout sees the change
      const updatedUser = res.data?.data as any;
      if (updatedUser && user) {
        setUser({ ...user, addresses: updatedUser.addresses ?? updated });
      }
      setAddresses(updated);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        "Lưu địa chỉ thất bại. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditIndex(null);
    setError(null);
    setModalOpen(true);
  };

  const openEditModal = (idx: number) => {
    setEditIndex(idx);
    setError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditIndex(null);
    setError(null);
  };

  const handleSave = async (newAddr: AuthAddress) => {
    let updated: AuthAddress[];

    if (editIndex !== null) {
      // Edit existing
      updated = addresses.map((a, i) => (i === editIndex ? newAddr : a));
    } else {
      // Add new
      updated = [...addresses, newAddr];
    }

    // Normalize: only one default
    if (newAddr.isDefault) {
      updated = updated.map((a, i) => ({
        ...a,
        isDefault:
          editIndex !== null ? i === editIndex : i === updated.length - 1,
      }));
    } else if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      // Auto-set first as default if none selected
      updated[0] = { ...updated[0], isDefault: true };
    }

    await persistAddresses(updated);
    closeModal();
  };

  const handleDelete = async (idx: number) => {
    const updated = addresses.filter((_, i) => i !== idx);
    // If we deleted the default and there are remaining addresses, assign first as default
    if (addresses[idx].isDefault && updated.length > 0) {
      updated[0] = { ...updated[0], isDefault: true };
    }
    await persistAddresses(updated);
  };

  const handleSetDefault = async (idx: number) => {
    const updated = addresses.map((a, i) => ({ ...a, isDefault: i === idx }));
    await persistAddresses(updated);
  };

  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">
          {t("customer:addresses.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("customer:addresses.subtitle")}
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">
            error
          </span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {addresses.map((addr, idx) => {
          const labelKey = (addr.label as AddressLabel) ?? "other";
          const opt =
            LABEL_OPTIONS.find((o) => o.value === labelKey) ??
            LABEL_OPTIONS[2];
          return (
            <div
              key={idx}
              className="group relative flex flex-col justify-between p-6 bg-card rounded-xl shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center size-10 rounded-full ${LABEL_ICON_BG[labelKey]}`}
                    >
                      <span className="material-symbols-outlined">
                        {opt.icon}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-foreground">
                      {opt.text}
                    </h3>
                  </div>
                  {addr.isDefault && (
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--health) 15%, transparent)",
                        color: "var(--health)",
                      }}
                    >
                      {t("customer:addresses.default")}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm mb-1">
                  {addr.receiver_name} · {addr.phone}
                </p>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {addr.detail}, {addr.ward}, {addr.district}, {addr.city}
                </p>
              </div>
              <div className="flex items-center gap-2 pt-4 border-t border-border flex-wrap">
                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(idx)}
                    disabled={saving}
                    className="text-xs font-medium text-orange-600 hover:underline disabled:opacity-50"
                  >
                    Đặt mặc định
                  </button>
                )}
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => openEditModal(idx)}
                  className="py-1.5 px-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
                >
                  {t("customer:addresses.edit")}
                </button>
                <div className="w-px h-4 bg-border" />
                <button
                  type="button"
                  onClick={() => handleDelete(idx)}
                  disabled={saving}
                  className="py-1.5 px-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50"
                >
                  {t("customer:addresses.delete")}
                </button>
              </div>
            </div>
          );
        })}

        {/* Add new card */}
        <button
          type="button"
          onClick={openAddModal}
          className="group flex flex-col items-center justify-center p-6 min-h-[200px] rounded-xl border-2 border-dashed border-orange-600/30 bg-orange-600/5 hover:bg-orange-600/10 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-center size-14 rounded-full bg-orange-600 text-orange-600-foreground shadow-lg shadow-orange-600/30 mb-4 group-hover:scale-110 transition-transform duration-300">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 32 }}
            >
              add
            </span>
          </div>
          <span className="text-orange-600 font-bold text-lg">
            {t("customer:addresses.addAddress")}
          </span>
        </button>
      </div>

      {/* ── Add / Edit Modal ── */}
      <AddressModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        initialData={editIndex !== null ? addresses[editIndex] : null}
        isFirstAddress={addresses.length === 0}
      />
    </>
  );
};

export default AddressesPage;
