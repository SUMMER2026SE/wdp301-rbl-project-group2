import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { userService } from "@/services/profile.service";
import {
  Search,
  X,
  Trash2,
  ShieldAlert,
  Sparkles,
  Save,
  RotateCcw,
  AlertOctagon,
  ChevronRight
} from "lucide-react";
import {
  ALLERGY_OPTIONS,
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
  const { setUser, user } = useAuth();

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
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  useEffect(() => {
    setPwError(null);
    setPwSuccess(null);
  }, [activeTab]);

  // Personal info
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [receiveCampaignNotifications, setReceiveCampaignNotifications] = useState(true);
  const [initial, setInitial] = useState<{ username: string; fullName: string; phone: string }>({
    username: "",
    fullName: "",
    phone: "",
  });
  const [initialNotifications, setInitialNotifications] = useState(true);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [initialAllergies, setInitialAllergies] = useState<string[]>([]);
  const [allergySearch, setAllergySearch] = useState("");


  /* ── helpers ── */
  const toggleAllergy = (id: string) => {
    setAllergies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const normalize = (v: string) => v.trim();
  const isDirty =
    normalize(username) !== normalize(initial.username) ||
    normalize(fullName) !== normalize(initial.fullName) ||
    normalize(phone) !== normalize(initial.phone) ||
    receiveCampaignNotifications !== initialNotifications;

  const isPrefsDirty =
    JSON.stringify([...allergies].sort()) !== JSON.stringify([...initialAllergies].sort());

  const filteredAllergies = useMemo(() => {
    const q = allergySearch.trim().toLowerCase();
    if (!q) return ALLERGY_OPTIONS;
    return ALLERGY_OPTIONS.filter((option) =>
      option.label.toLowerCase().includes(q) || option.id.toLowerCase().includes(q)
    );
  }, [allergySearch]);

  const selectedAllergyOptions = useMemo(
    () => allergies
      .map((id) => ALLERGY_OPTIONS.find((option) => option.id === id))
      .filter(Boolean) as typeof ALLERGY_OPTIONS,
    [allergies]
  );

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
        setFullName(me.fullName ?? "");
        setEmail(me.email ?? "");
        setPhone(me.phone ?? "");
        setReceiveCampaignNotifications(me.receiveCampaignNotifications ?? true);
        setInitial({
          username: me.username ?? "",
          fullName: me.fullName ?? "",
          phone: me.phone ?? "",
        });
        setInitialNotifications(me.receiveCampaignNotifications ?? true);

        const prefs = me.preferences ?? { dietary: [], allergies: [], healthGoals: [] };
        setAllergies(prefs.allergies ?? []);
        setInitialAllergies(prefs.allergies ?? []);
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
        fullName: fullName.trim() || undefined,
        phone: phone.trim() || undefined,
        receiveCampaignNotifications,
      });
      setInitial({
        username: username.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setInitialNotifications(receiveCampaignNotifications);
      if (user) {
        setUser({
          ...user,
          username: username.trim(),
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          receiveCampaignNotifications,
        });
      }
      toast.success(t("customer:profileSettings.updateSuccess"));
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Cập nhật thông tin không thành công";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── save health preferences ── */
  const onSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      const nextPreferences = {
        dietary: [],
        allergies,
        healthGoals: [],
      };
      await userService.updatePreferences(nextPreferences);
      setInitialAllergies(allergies);
      if (user) {
        setUser({
          ...user,
          preferences: nextPreferences,
        });
      }
      toast.success("Hồ sơ dị ứng đã được cập nhật");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Không thể lưu cài đặt";
      toast.error(msg);
    } finally {
      setSavingPrefs(false);
    }
  };

  const onDeleteHealthProfile = async () => {
    if (!window.confirm("Bạn có chắc muốn xóa Hồ sơ Sức khỏe AI?")) return;
    try {
      setSavingPrefs(true);
      const emptyPreferences = {
        dietary: [],
        allergies: [],
        healthGoals: [],
      };
      await userService.updatePreferences(emptyPreferences);
      setAllergies([]);
      setInitialAllergies([]);
      setAllergySearch("");
      if (user) {
        setUser({
          ...user,
          preferences: emptyPreferences,
        });
      }
      toast.success("Hồ sơ Sức khỏe AI đã được xóa");
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Không thể xóa hồ sơ";
      toast.error(msg);
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
      toast.success("Đổi mật khẩu thành công");
      setPwSuccess("Đổi mật khẩu thành công! Mật khẩu của bạn đã được cập nhật.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwSuccess(null), 5000);
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
              <div className="space-y-2">
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
                <label className="text-sm font-semibold ml-1">Họ và tên</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">badge</span>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading || saving}
                    className="w-full pl-12 pr-4 py-3.5 bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-transparent transition-shadow text-foreground placeholder:text-muted-foreground disabled:opacity-70"
                    placeholder="Nhập họ và tên"
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

              <div className="md:col-span-2 border-t border-border pt-6 mt-4">
                <h4 className="text-sm font-bold mb-3">Cài đặt thông báo</h4>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={receiveCampaignNotifications}
                    onChange={(e) => setReceiveCampaignNotifications(e.target.checked)}
                    disabled={loading || saving}
                    className="mt-1 accent-orange-600 size-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-foreground group-hover:text-orange-600 transition-colors">
                      Nhận email thông báo chiến dịch ưu đãi
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chúng tôi sẽ gửi email cho bạn khi có các chiến dịch khuyến mãi mới với ưu đãi đặc biệt.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {isDirty && (
            <div className="flex flex-col md:flex-row md:justify-end gap-4">
              <button
                type="button"
                className="bg-background text-foreground px-8 py-4 rounded-2xl font-bold border border-border hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                onClick={() => {
                  setUsername(initial.username);
                  setFullName(initial.fullName);
                  setPhone(initial.phone);
                  setReceiveCampaignNotifications(initialNotifications);
                  setError(null);
                }}
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

      {/* ─── Tab: Sức khỏe & AI (Refactored Flat Design) ─── */}
      {activeTab === "health" && (
        <div className="bg-white rounded-2xl p-5 md:p-8 shadow-sm border border-slate-200 relative">

          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <h3 className="text-xl font-bold text-slate-900">Hồ sơ dị ứng</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-200 uppercase tracking-wide">
                  Beta
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-3 max-w-2xl leading-relaxed">
                Hệ thống AI sẽ đối chiếu thực đơn với danh sách này để tự động ẩn món nguy hiểm và gợi ý món ăn an toàn cho bạn.
              </p>
              <Link
                to="/ai-suggestions"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 transition-colors group"
              >
                <Sparkles className="w-4 h-4" />
                Xem gợi ý món ăn dành riêng cho bạn
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <button
              type="button"
              onClick={onDeleteHealthProfile}
              disabled={savingPrefs || allergies.length === 0}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Xóa hồ sơ
            </button>
          </div>

          {/* Main Content Grid */}
          <div className="flex flex-col gap-6 xl:gap-8">

            {/* Top Section: Summary & Actions */}
            <aside className="bg-white pb-2 flex flex-col xl:flex-row gap-5 items-start">
              <div className={`flex-1 w-full rounded-xl border p-5 transition-colors ${isPrefsDirty ? "bg-amber-50/50 border-amber-200" : "bg-slate-50 border-slate-200"}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Tổng quan hồ sơ</h4>
                    <p className="text-xs text-slate-500">
                      Đang chặn <strong className="text-slate-900">{allergies.length}</strong> nguyên liệu
                    </p>
                  </div>
                </div>

                {isPrefsDirty && (
                  <div className="mb-4 text-[11px] font-medium text-amber-700 bg-amber-100/50 px-2.5 py-1.5 rounded text-center border border-amber-200/50">
                    *Bạn có thay đổi chưa được lưu
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 p-3.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Danh sách đã chọn
                  </p>
                  {selectedAllergyOptions.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      Chưa có nguyên liệu nào bị chặn.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAllergyOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleAllergy(option.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-medium hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          {option.label}
                          <X className="w-3 h-3" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 w-full xl:w-56 shrink-0">
                <button
                  type="button"
                  onClick={onSavePreferences}
                  disabled={savingPrefs || !isPrefsDirty}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {savingPrefs ? (
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {savingPrefs ? "Đang xử lý..." : "Lưu thay đổi"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAllergies(initialAllergies);
                    setAllergySearch("");
                  }}
                  disabled={savingPrefs || !isPrefsDirty}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RotateCcw className="w-4 h-4" />
                  Hủy thao tác
                </button>
              </div>
            </aside>

            {/* Right Column: Selection List */}
            <section className="flex flex-col">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-base font-semibold text-slate-900">Danh mục nguyên liệu</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click vào thẻ để chọn hoặc bỏ chọn nguyên liệu mẫn cảm.
                  </p>
                </div>

                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={allergySearch}
                    onChange={(e) => setAllergySearch(e.target.value)}
                    placeholder="Tìm nguyên liệu..."
                    className="w-full text-sm py-2 pl-9 pr-8 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-slate-900 placeholder:text-slate-400 outline-none transition-all"
                  />
                  {allergySearch && (
                    <button
                      type="button"
                      onClick={() => setAllergySearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {filteredAllergies.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
                  Không tìm thấy nguyên liệu phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredAllergies.map((a) => {
                    const active = allergies.includes(a.id);
                    return (
                      <div
                        key={a.id}
                        onClick={() => toggleAllergy(a.id)}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${active
                          ? "border-red-300 bg-red-50"
                          : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/50"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600"
                              }`}
                          >
                            {/* Vẫn giữ icon material cho phần data động */}
                            <span className="material-symbols-outlined text-[20px]">
                              {a.icon}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-semibold text-sm leading-tight ${active ? "text-red-900" : "text-slate-700"}`}>
                              {a.label}
                            </span>
                            <span className={`text-[11px] mt-0.5 ${active ? "text-red-600" : "text-slate-500"}`}>
                              {active ? "Đang chặn" : "Hiển thị bình thường"}
                            </span>
                          </div>
                        </div>
                        {active && <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
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

          {pwSuccess && (
            <div className="flex items-center gap-2 px-5 py-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-6 text-sm font-semibold">
              <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
              <p>{pwSuccess}</p>
            </div>
          )}

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
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showNewPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
              {/* Password Strength Criteria */}
              <div className="flex flex-col gap-1.5 mt-1.5 px-1">
                <p className="text-xs font-semibold text-muted-foreground">Yêu cầu mật khẩu:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className={`flex items-center gap-1.5 transition-colors ${newPassword.length >= 8 ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground/70"}`}>
                    <span className="material-symbols-outlined text-[16px]">{newPassword.length >= 8 ? "check_circle" : "circle"}</span>
                    <span>Tối thiểu 8 ký tự</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${/[A-Z]/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground/70"}`}>
                    <span className="material-symbols-outlined text-[16px]">{/[A-Z]/.test(newPassword) ? "check_circle" : "circle"}</span>
                    <span>Ít nhất 1 chữ viết hoa</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${/[0-9]/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground/70"}`}>
                    <span className="material-symbols-outlined text-[16px]">{/[0-9]/.test(newPassword) ? "check_circle" : "circle"}</span>
                    <span>Ít nhất 1 chữ số</span>
                  </div>
                  <div className={`flex items-center gap-1.5 transition-colors ${/[^a-zA-Z0-9]/.test(newPassword) ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground/70"}`}>
                    <span className="material-symbols-outlined text-[16px]">{/[^a-zA-Z0-9]/.test(newPassword) ? "check_circle" : "circle"}</span>
                    <span>Ít nhất 1 ký tự đặc biệt</span>
                  </div>
                </div>
              </div>
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
