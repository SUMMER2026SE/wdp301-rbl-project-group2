import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
// Removed useAuthStore
import { useToast } from "@/hooks/useToast";
import { userService } from "@/services/profile.service";

import {
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  HEALTH_GOALS,

} from "@/constants/preferences";

type Tab = "profile" | "health" | "password";

const HEALTH_COLOR = "var(--health)";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "profile", label: "Thông tin cá nhân", icon: "badge" },
  { id: "health", label: "Sức khỏe & AI", icon: "health_and_safety" },
  { id: "password", label: "Đổi mật khẩu", icon: "lock" },
];

const ProfileSettingsPage = () => {
  const { t } = useTranslation(["customer", "common"]);
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // Personal info
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [initial, setInitial] = useState<{ username: string; phone: string }>({
    username: "",
    phone: "",
  });

  // Health preferences (string[] IDs)
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [initialPrefs, setInitialPrefs] = useState<{
    dietary: string[];
    allergies: string[];
    health_goals: string[];
  }>({ dietary: [], allergies: [], health_goals: [] });
  const [isHealthEditMode, setIsHealthEditMode] = useState(false);


  /* ── helpers ── */
  const toggleSet = (
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) => {
    if (!isHealthEditMode) return;
    setState((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const normalize = (v: string) => v.trim();
  const isDirty =
    normalize(username) !== normalize(initial.username) ||
    normalize(phone) !== normalize(initial.phone);

  const isPrefsDirty =
    JSON.stringify([...diet].sort()) !== JSON.stringify([...initialPrefs.dietary].sort()) ||
    JSON.stringify([...allergies].sort()) !== JSON.stringify([...initialPrefs.allergies].sort()) ||
    JSON.stringify([...healthGoals].sort()) !== JSON.stringify([...initialPrefs.health_goals].sort());

  /* ── load from API ── */
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await userService.getMe();
        const me = res.data.data;

        setUsername(me.username ?? "");
        setEmail(me.email ?? "");
        setPhone(me.phone ?? "");
        setInitial({ username: me.username ?? "", phone: me.phone ?? "" });

        const prefs = me.preferences ?? { dietary: [], allergies: [], health_goals: [] };
        setDiet(prefs.dietary ?? []);
        setAllergies(prefs.allergies ?? []);
        setHealthGoals(prefs.health_goals ?? []);
        setInitialPrefs({
          dietary: prefs.dietary ?? [],
          allergies: prefs.allergies ?? [],
          health_goals: prefs.health_goals ?? [],
        });
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.response?.data?.message || e?.message || "Không thể tải thông tin người dùng");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, []);





















  /* ── save personal info ── */
  const onUpdateProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      await userService.updateMe({
        username: username.trim(),
        phone: phone.trim() || undefined,
      });
      setInitial({ username: username.trim(), phone: phone.trim() });
      toast(t("customer:profileSettings.updateSuccess"), "success");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Cập nhật thông tin không thành công";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  /* ── save health preferences ── */
  const onSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await userService.updatePreferences({
        dietary: diet,
        allergies,
        health_goals: healthGoals,
      });
      setInitialPrefs({ dietary: diet, allergies, health_goals: healthGoals });
      setIsHealthEditMode(false);
      toast("Cài đặt sức khỏe đã được cập nhật", "success");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Không thể lưu cài đặt";
      toast(msg, "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  const onDeleteHealthProfile = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa Hồ sơ Sức khỏe AI?")) return;
    try {
      setSavingPrefs(true);
      await userService.updatePreferences({
        dietary: [],
        allergies: [],
        health_goals: [],
      });
      setDiet([]);
      setAllergies([]);
      setHealthGoals([]);
      setInitialPrefs({ dietary: [], allergies: [], health_goals: [] });
      setIsHealthEditMode(false);
      toast("Hồ sơ Sức khỏe AI đã được xóa", "success");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Không thể xóa hồ sơ";
      toast(msg, "error");
    } finally {
      setSavingPrefs(false);
    }
  };

  /* ── change password ── */
  const onChangePassword = async () => {
    setPwError(null);
    if (newPassword !== confirmPassword) {
      setPwError("Mật khẩu xác nhận không khớp");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    try {
      setSavingPw(true);
      await userService.changePassword({ currentPassword, newPassword });
      toast("Đổi mật khẩu thành công", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Đổi mật khẩu không thành công";
      setPwError(msg);
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <>
      {/* ─── Header ─── */}
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3">
          {t("customer:profileSettings.title")}
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          {t("customer:profileSettings.subtitle")}
        </p>
      </div>

      {/* ─── Tab Bar ─── */}
      <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-8 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab: Thông tin cá nhân ─── */}
      {activeTab === "profile" && (
        <div className="space-y-8">
          <div className="bg-card rounded-2xl p-6 md:p-10 shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold mb-1">
                  {t("customer:profileSettings.personalInfo")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {t("customer:profileSettings.personalInfoDesc")}
                </p>
              </div>
              <div className="p-2 bg-accent rounded-full text-foreground">
                <span className="material-symbols-outlined">badge</span>
              </div>
            </div>

            {error && (
              <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-2xl px-5 py-4 mb-6">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-2">
                <label className="text-sm font-semibold ml-1">Username</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">person</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading || saving}
                    className="w-full pl-12 pr-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70"
                    placeholder="Nhập username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">
                  {t("customer:profileSettings.email")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">mail</span>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full pl-12 pr-4 py-3.5 bg-muted/40 border border-input rounded-2xl text-foreground cursor-not-allowed"
                    placeholder="Email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">
                  {t("customer:profileSettings.phone")}
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">call</span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={loading || saving}
                    className="w-full pl-12 pr-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70"
                    placeholder="Nhập số điện thoại"
                  />
                </div>
              </div>
            </div>
          </div>

          {isDirty && (
            <div className="flex flex-col md:flex-row md:justify-end gap-4">
              <button
                type="button"
                className="bg-background text-foreground px-8 py-4 rounded-2xl font-bold border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => { setUsername(initial.username); setPhone(initial.phone); setError(null); }}
                disabled={saving}
              >
                {t("customer:profileSettings.cancel")}
              </button>
              <button
                type="button"
                onClick={onUpdateProfile}
                disabled={loading || saving || username.trim().length === 0}
                className="bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-orange-600/90 text-orange-600-foreground px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-orange-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>{saving ? "Đang lưu..." : t("customer:profileSettings.updateProfile")}</span>
                <span className="material-symbols-outlined">check_circle</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Sức khỏe & AI ─── */}
      {activeTab === "health" && (
        <div className="bg-card rounded-2xl p-6 md:p-10 shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-50"
            style={{ backgroundColor: "color-mix(in srgb, var(--health) 20%, transparent)" }}
          />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold">{t("customer:profileSettings.aiHealthProfile")}</h3>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--health) 15%, transparent)",
                    color: "var(--health)",
                    borderColor: "color-mix(in srgb, var(--health) 30%, transparent)",
                  }}
                >Beta</span>
              </div>
              <p className="text-muted-foreground text-sm mb-2">AI sẽ gợi ý thực đơn dựa trên các tùy chọn của bạn.</p>
              <Link
                to="/ai-suggestions"
                className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
                style={{ color: "var(--health)" }}
              >
                <span className="material-symbols-outlined text-base">restaurant</span>
                Xem gợi ý món ăn phù hợp
              </Link>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isHealthEditMode) {
                    setIsHealthEditMode(false);
                    setDiet(initialPrefs.dietary);
                    setAllergies(initialPrefs.allergies);
                    setHealthGoals(initialPrefs.health_goals);
                  } else {
                    setIsHealthEditMode(true);
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isHealthEditMode
                  ? "bg-[var(--health)] text-white"
                  : "bg-[var(--health)]/10 text-[var(--health)] hover:bg-[var(--health)]/20"
                  }`}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {isHealthEditMode ? "Hủy chỉnh sửa" : "Chỉnh sửa"}
              </button>
              <button
                type="button"
                onClick={onDeleteHealthProfile}
                disabled={savingPrefs}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                Xóa hồ sơ
              </button>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="mb-10">
            <label className="text-sm font-semibold mb-4 block">
              {t("customer:profileSettings.dietaryPreferences")}
            </label>
            <div className="flex flex-wrap gap-3">
              {DIET_OPTIONS.map((opt) => {
                const active = diet.includes(opt.id);
                return (
                  <label key={opt.id} className={isHealthEditMode ? "cursor-pointer" : "cursor-not-allowed"}>
                    <input type="checkbox" checked={active} disabled={!isHealthEditMode} onChange={() => toggleSet(setDiet, opt.id)} className="sr-only peer" />
                    <span
                      className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl border font-medium transition-all peer-checked:shadow-md ${isHealthEditMode ? "hover:border-[var(--health)]/50" : "opacity-80"} ${active ? "border-[var(--health)] text-white shadow-[var(--health)]/20" : "border-input bg-background text-muted-foreground"
                        }`}
                      style={active ? { backgroundColor: HEALTH_COLOR, boxShadow: `0 4px 14px color-mix(in srgb, var(--health) 25%, transparent)` } : undefined}
                    >
                      <span className="material-symbols-outlined text-[16px]">{opt.icon}</span>
                      {opt.label}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border w-full mb-8" />

          {/* Allergies */}
          <div className="mb-10">
            <label className="text-sm font-semibold mb-4 block">
              {t("customer:profileSettings.allergies")}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALLERGY_OPTIONS.map((a) => {
                const active = allergies.includes(a.id);
                return (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between p-3 rounded-xl bg-background border transition-colors ${active ? "border-red-300 dark:border-red-700" : "border-transparent hover:border-[var(--health)]/20"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-8 rounded-full flex items-center justify-center ${a.colorClass}`}>
                        <span className="material-symbols-outlined text-sm">{a.icon}</span>
                      </div>
                      <span className="font-medium text-sm">{a.label}</span>
                    </div>
                    <label className={`flex items-center relative ${isHealthEditMode ? "cursor-pointer" : "cursor-not-allowed"}`}>
                      <input type="checkbox" checked={active} disabled={!isHealthEditMode} onChange={() => toggleSet(setAllergies, a.id)} className="sr-only peer" />
                      <div
                        className={`w-11 h-6 rounded-full relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:border after:border-gray-300 peer-checked:after:translate-x-5 bg-muted transition-colors ${!isHealthEditMode && "opacity-80"}`}
                        style={{ backgroundColor: active ? HEALTH_COLOR : undefined }}
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-border w-full mb-8" />

          {/* Health Goals */}
          <div>
            <label className="text-sm font-semibold mb-4 block">Mục tiêu sức khỏe</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {HEALTH_GOALS.map((g) => {
                const active = healthGoals.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggleSet(setHealthGoals, g.id)}
                    disabled={!isHealthEditMode}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all group ${active ? "border-primary bg-primary/5" : "border-transparent bg-background"
                      } ${isHealthEditMode ? "hover:border-primary/30" : "opacity-80 cursor-not-allowed"}`}
                  >
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 transition-transform ${isHealthEditMode ? "group-hover:scale-110" : ""} ${active ? "bg-primary" : "bg-muted"}`}>
                      <span className={`material-symbols-outlined text-[18px] ${active ? "text-primary-foreground" : "text-primary"}`}>{g.icon}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm">{g.label}</p>
                      <p className="text-muted-foreground text-xs truncate">{g.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {isPrefsDirty && (
            <div className="mt-8 flex justify-end">
              <button
                type="button"
                onClick={onSavePreferences}
                disabled={savingPrefs}
                className="flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-white disabled:opacity-50 transition-all hover:brightness-105 active:scale-[0.98]"
                style={{ backgroundColor: HEALTH_COLOR, boxShadow: `0 4px 16px color-mix(in srgb, var(--health) 30%, transparent)` }}
              >
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {savingPrefs ? "progress_activity" : "save"}
                </span>
                {savingPrefs ? "Đang lưu..." : "Lưu cài đặt sức khỏe"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Đổi mật khẩu ─── */}
      {activeTab === "password" && (
        <div className="bg-card rounded-2xl p-6 md:p-10 shadow-[0_4px_20px_-2px_rgba(28,19,13,0.05)] border border-border max-w-lg">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold mb-1">Đổi mật khẩu</h3>
              <p className="text-muted-foreground text-sm">Mật khẩu mới phải có ít nhất 8 ký tự.</p>
            </div>
            <div className="p-2 bg-accent rounded-full text-foreground">
              <span className="material-symbols-outlined">lock</span>
            </div>
          </div>

          {pwError && (
            <div className="border border-destructive/30 bg-destructive/10 text-destructive rounded-2xl px-5 py-4 mb-6 text-sm">
              {pwError}
            </div>
          )}

          <div className="space-y-5">
            {/* Current password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Mật khẩu hiện tại</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">lock</span>
                <input
                  type={showCurrentPw ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPw}
                  className="w-full pl-12 pr-12 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70"
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showCurrentPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {/* New password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Mật khẩu mới</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">lock_open</span>
                <input
                  type={showNewPw ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPw}
                  className="w-full pl-12 pr-12 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70"
                  placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showNewPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {/* Strength indicator */}
              {newPassword.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${newPassword.length >= 12 && i < 4 ? "bg-green-500" :
                        newPassword.length >= 10 && i < 3 ? "bg-yellow-400" :
                          newPassword.length >= 8 && i < 2 ? "bg-orange-400" :
                            newPassword.length >= 4 && i < 1 ? "bg-red-400" : "bg-muted"
                        }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {newPassword.length >= 12 ? "Rất mạnh" :
                      newPassword.length >= 10 ? "Mạnh" :
                        newPassword.length >= 8 ? "Trung bình" : "Yếu"}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">lock_open</span>
                <input
                  type={showConfirmPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={savingPw}
                  className={`w-full pl-12 pr-12 py-3.5 bg-background border rounded-2xl focus:outline-none focus:ring-2 focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70 ${confirmPassword && newPassword !== confirmPassword
                    ? "border-destructive focus:ring-destructive"
                    : "border-input focus:ring-primary"
                    }`}
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showConfirmPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive ml-1">Mật khẩu xác nhận không khớp</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <button
              type="button"
              onClick={onChangePassword}
              disabled={savingPw || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-primary disabled:opacity-60 disabled:cursor-not-allowed hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-2xl font-bold text-base shadow-lg shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                {savingPw ? "progress_activity" : "lock_reset"}
              </span>
              {savingPw ? "Đang xử lý..." : "Đổi mật khẩu"}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileSettingsPage;