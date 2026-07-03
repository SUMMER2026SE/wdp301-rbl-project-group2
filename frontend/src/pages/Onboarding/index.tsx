import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services/profile.service";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Search,
  X,
  CheckCircle2,
  Loader2,
  AlertOctagon,
  Info
} from "lucide-react";

import {
  ALLERGY_OPTIONS,
  PENDING_PREFS_KEY,
  type PendingPreferences,
} from "@/constants/preferences";
import logo from "@/assets/logo.png";

const OnboardingPage = () => {
  const navigate = useNavigate();
  useTranslation(["customer", "common"]);
  const { isAuthenticated, getUser } = useAuth();

  useEffect(() => {
    document.title = "FoodieDash | Thiết lập dị ứng & sức khỏe";
  }, []);

  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergySearch, setAllergySearch] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleAllergy = (id: string) => {
    setAllergies((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredAllergies = useMemo(() => {
    const q = allergySearch.trim().toLowerCase();
    if (!q) return ALLERGY_OPTIONS;
    return ALLERGY_OPTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [allergySearch]);

  const hasSelectedAllergies = allergies.length > 0;

  const handleComplete = async () => {
    setSaving(true);
    try {
      if (isAuthenticated) {
        await userService.updatePreferences({
          allergies,
          dietary: [],
          healthGoals: [],
        });
        await getUser();
        toast.success("Thiết lập hồ sơ thành công!");
        navigate("/", { replace: true });
      } else {
        const prefs: PendingPreferences = {
          dietary: [],
          allergies,
          healthGoals: [],
        };
        localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(prefs));
        toast.success("Đã lưu tạm. Vui lòng đăng nhập để đồng bộ!");
        navigate("/login", { state: { fromOnboarding: true } });
      }
    } catch (err: any) {
      console.error("Lỗi lưu thiết lập:", err);
      toast.error(err?.response?.data?.message || "Lỗi hệ thống, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    } else {
      localStorage.removeItem(PENDING_PREFS_KEY);
      navigate("/login");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen font-sans flex flex-col relative">
      {/* Top Bar - Clean & Flat */}
      <div className="fixed top-0 left-0 w-full bg-white border-b border-slate-200 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0 cursor-pointer"
          >
            <img
              src={logo}
              alt="FoodieDash"
              className="h-12 -ml-5 -mr-7 object-contain group-hover:rotate-12 transition-transform duration-300"
            />
            <h2 className="text-xl font-black tracking-tighter text-orange-600">
              FoodieDash
            </h2>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold shadow-sm shadow-orange-600/20">
            <ShieldCheck className="w-4 h-4" />
            <span>Hồ sơ Sức khỏe</span>
          </div>
        </div>
      </div>

      <main className="pt-24 pb-16 px-4 sm:px-6 flex-1 flex flex-col items-center justify-center z-10">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3">
              Thiết lập Dữ liệu Dị ứng
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed">
              Hãy cho chúng tôi biết các thành phần bạn cần tránh. Hệ thống sẽ tự động đối chiếu với thực đơn và chặn các món ăn không an toàn.
            </p>
          </div>

          {/* Info Card - Professional Trust Vibe */}
          <div className="mb-8 flex items-start gap-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
            <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-orange-900 text-sm">
                Cam kết an toàn thực phẩm
              </h4>
              <p className="text-sm text-orange-800/80 leading-relaxed">
                Khi có dấu hiệu chứa thành phần dị ứng đã chọn, món ăn sẽ được dán nhãn cảnh báo đỏ hoặc ẩn khỏi thực đơn của bạn.
              </p>
            </div>
          </div>

          {/* Selector Panel - Clean White Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Danh mục nguyên liệu</h2>
                <p className="text-slate-500 text-xs mt-1">Chọn các thành phần bạn mẫn cảm</p>
              </div>

              {/* Search Box - Standard */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={allergySearch}
                  onChange={(e) => setAllergySearch(e.target.value)}
                  placeholder="Tìm kiếm nguyên liệu..."
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

            {/* Interactive Grid - Flat Design */}
            {filteredAllergies.length === 0 ? (
              <div className="text-center text-slate-500 py-10 rounded-xl border border-dashed border-slate-200 text-sm bg-slate-50">
                Không tìm thấy nguyên liệu nào phù hợp.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
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
                          {/* Dùng chuẩn material icon nếu data đang cấu hình thế */}
                          <span className="material-symbols-outlined text-[20px]">
                            {a.icon}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm ${active ? "text-red-900" : "text-slate-700"}`}>
                            {a.label}
                          </span>
                          <span className={`text-[11px] ${active ? "text-red-600" : "text-slate-500"}`}>
                            {active ? "Đã chọn chặn" : "Hiển thị bình thường"}
                          </span>
                        </div>
                      </div>

                      {active && (
                        <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected Tags list */}
            <AnimatePresence>
              {hasSelectedAllergies && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pt-5 border-t border-slate-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-slate-600">
                      Đang chặn ({allergies.length}) nguyên liệu
                    </p>
                    <button
                      type="button"
                      onClick={() => setAllergies([])}
                      className="text-xs font-medium text-slate-500 hover:text-red-600"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {allergies.map((id) => {
                        const opt = ALLERGY_OPTIONS.find((o) => o.id === id);
                        return (
                          <motion.span
                            key={id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-semibold border border-red-200"
                          >
                            {opt?.label}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAllergy(id);
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <X className="w-3.5 h-3.5 block" />
                            </button>
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Row - Clean Sticky Mobile */}
          <div className="fixed sm:relative bottom-0 left-0 w-full sm:w-auto p-4 sm:p-0 bg-white sm:bg-transparent border-t border-slate-200 sm:border-none mt-8 z-40">
            <div className="flex flex-col-reverse sm:flex-row gap-3 max-w-2xl mx-auto w-full">
              {!hasSelectedAllergies && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={saving}
                  className="flex-1 h-12 w-full rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-sm bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Bỏ qua thiết lập này
                </button>
              )}

              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className={`h-12 rounded-xl text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${hasSelectedAllergies
                  ? "flex-1 w-full bg-orange-600 hover:bg-orange-700"
                  : "flex-[2] w-full bg-slate-900 hover:bg-slate-800"
                  }`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {hasSelectedAllergies ? "Lưu hồ sơ dị ứng" : "Hoàn tất mặc định"}
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="h-24 sm:h-0 w-full shrink-0" />

          <p className="mt-4 text-[12px] text-slate-400 text-center leading-relaxed max-w-lg mx-auto px-4">
            Thiết lập có thể được thay đổi bất kỳ lúc nào tại mục Cá nhân → Sức khỏe. Dữ liệu của bạn được bảo mật nghiêm ngặt.
          </p>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;
