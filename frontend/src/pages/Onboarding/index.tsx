import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  HEALTH_GOALS,
  PENDING_PREFS_KEY,
  type PendingPreferences,

} from "@/constants/preferences";

const HEALTH_COLOR = "var(--health)";

const STEPS = [
  { id: 1, label: "Chế độ ăn", icon: "restaurant_menu" },
  { id: 2, label: "Dị ứng", icon: "warning" },
  { id: 3, label: "Mục tiêu", icon: "flag" },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["customer", "common"]);

  const [step, setStep] = useState(1);
  const [diet, setDiet] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [healthGoals, setHealthGoals] = useState<string[]>([]);
  const [allergySearch, setAllergySearch] = useState("");






















  /* ── helpers ── */
  const toggleSet = (
    setState: React.Dispatch<React.SetStateAction<string[]>>,
    id: string
  ) =>
    setState((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filteredAllergies = useMemo(() => {
    const q = allergySearch.trim().toLowerCase();
    if (!q) return ALLERGY_OPTIONS;
    return ALLERGY_OPTIONS.filter((a) => a.label.toLowerCase().includes(q));
  }, [allergySearch]);

  /* ── save & navigate ── */
  const savePrefs = () => {
    const prefs: PendingPreferences = {
      dietary: diet,
      allergies,
      health_goals: healthGoals,
    };
    localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(prefs));
  };

  const handleComplete = () => {
    savePrefs();
    navigate("/login", { state: { fromOnboarding: true } });
  };

  const handleSkip = () => {
    localStorage.removeItem(PENDING_PREFS_KEY);
    navigate("/login");
  };

  const canGoNext = step < 3;

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full bg-card/80 backdrop-blur-md z-50 border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 text-orange-600 cursor-pointer group"
          >
            <div className="bg-orange-600 text-white p-2 rounded-xl group-hover:rotate-12 transition-transform duration-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            </div>
            <h2 className="text-2xl font-black tracking-tighter">FoodieDash</h2>
          </div>

          {/* Step pill indicators */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${step === s.id
                      ? "text-white"
                      : step > s.id
                        ? "bg-green-100 dark:bg-green-900/30 text-green-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  style={step === s.id ? { backgroundColor: HEALTH_COLOR } : undefined}
                >
                  {step > s.id ? (
                    <span
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="h-px w-6 rounded-full transition-colors"
                    style={{
                      backgroundColor:
                        step > s.id ? "var(--health)" : "var(--border)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="pt-28 pb-12 px-6 flex flex-col items-center">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight mb-3">
              {t("customer:onboarding.title", "Thiết lập hồ sơ sức khỏe")}
            </h1>
            <p className="text-muted-foreground text-lg">
              {t(
                "customer:onboarding.subtitle",
                "Giúp AI gợi ý món ăn phù hợp hoàn toàn với bạn"
              )}
            </p>
          </div>

          {/* AI badge */}
          <div className="mb-8 flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
            <span
              className="material-symbols-outlined text-primary mt-0.5 shrink-0"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-bold text-primary">Gợi ý AI:</span>{" "}
              Dữ liệu này giúp lọc 100% món ăn an toàn — đối chiếu nguyên liệu với hồ sơ của bạn theo
              thời gian thực.
              {diet.length + allergies.length + healthGoals.length > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary font-semibold">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {diet.length + allergies.length + healthGoals.length} tuỳ chọn đã chọn
                </span>
              )}
            </p>
          </div>

          {/* ─────────────── STEP 1: DIET ─────────────── */}
          {step === 1 && (
            <div className="bg-card rounded-[24px] border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="size-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--health) 15%, transparent)",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ color: HEALTH_COLOR }}
                  >
                    restaurant_menu
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Chế độ ăn uống</h2>
                  <p className="text-muted-foreground text-sm">
                    Chọn một hoặc nhiều chế độ phù hợp với bạn
                  </p>
                </div>
              </div>

              <div className="h-px bg-border my-6" />

              <div className="flex flex-wrap gap-3">
                {DIET_OPTIONS.map((opt) => {
                  const active = diet.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleSet(setDiet, opt.id)}
                      className={`flex items-center gap-2 h-11 px-5 rounded-xl font-medium border transition-all hover:brightness-105 active:scale-95 ${active
                          ? "text-white border-transparent shadow-md"
                          : "bg-muted/50 text-foreground border-border hover:border-[var(--health)]/50"
                        }`}
                      style={active ? { backgroundColor: HEALTH_COLOR } : undefined}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {diet.length > 0 && (
                <p className="mt-5 text-sm font-medium" style={{ color: HEALTH_COLOR }}>
                  ✓{" "}
                  {diet
                    .map((id) => DIET_OPTIONS.find((o) => o.id === id)?.label)
                    .join(", ")}
                </p>
              )}
            </div>
          )}

          {/* ─────────────── STEP 2: ALLERGIES ─────────────── */}
          {step === 2 && (
            <div className="bg-card rounded-[24px] border border-border p-8 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                    <span className="material-symbols-outlined text-red-500">warning</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Dị ứng & Không dung nạp
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      Chúng tôi sẽ lọc các món chứa thành phần này
                    </p>
                  </div>
                </div>

                {/* Working search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={allergySearch}
                    onChange={(e) => setAllergySearch(e.target.value)}
                    placeholder="Tìm chất gây dị ứng..."
                    className="text-sm py-2 pl-9 pr-8 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground placeholder:text-muted-foreground outline-none transition-all w-52"
                  />
                  {allergySearch && (
                    <button
                      type="button"
                      onClick={() => setAllergySearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="h-px bg-border my-6" />

              {filteredAllergies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Không tìm thấy kết quả phù hợp
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredAllergies.map((a) => {
                    const active = allergies.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${active
                            ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10"
                            : "border-border bg-muted/30 hover:bg-muted/60"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-9 rounded-lg flex items-center justify-center shrink-0 ${a.colorClass}`}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {a.icon}
                            </span>
                          </div>
                          <span className="font-medium text-foreground text-sm">
                            {a.label}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleSet(setAllergies, a.id)}
                          className="size-5 rounded"
                          style={{ accentColor: "#ef4444" }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Selected tags */}
              {allergies.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {allergies.map((id) => {
                    const opt = ALLERGY_OPTIONS.find((o) => o.id === id);
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium"
                      >
                        {opt?.label}
                        <button
                          type="button"
                          onClick={() => toggleSet(setAllergies, id)}
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─────────────── STEP 3: HEALTH GOALS ─────────────── */}
          {step === 3 && (
            <div className="bg-card rounded-[24px] border border-border p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="size-10 rounded-xl flex items-center justify-center bg-primary/10">
                  <span className="material-symbols-outlined text-primary">flag</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Mục tiêu sức khỏe</h2>
                  <p className="text-muted-foreground text-sm">
                    Chọn tất cả mục tiêu phù hợp — có thể chọn nhiều
                  </p>
                </div>
              </div>

              <div className="h-px bg-border my-6" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {HEALTH_GOALS.map((g) => {
                  const active = healthGoals.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleSet(setHealthGoals, g.id)}
                      className={`flex items-center gap-4 p-5 rounded-2xl border text-left transition-all group ${active
                          ? "border-2 border-primary bg-primary/5"
                          : "border border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5"
                        }`}
                    >
                      <div
                        className={`size-12 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${active ? "bg-primary" : "bg-card"
                          }`}
                      >
                        <span
                          className={`material-symbols-outlined ${active ? "text-primary-foreground" : "text-primary"
                            }`}
                        >
                          {g.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">{g.label}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{g.desc}</p>
                      </div>
                      {active && (
                        <span
                          className="material-symbols-outlined text-primary shrink-0"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {healthGoals.length > 0 && (
                <p className="mt-5 text-sm font-medium text-primary">
                  ✓ Đã chọn {healthGoals.length} mục tiêu
                </p>
              )}
            </div>
          )}

          {/* ─────────────── Navigation ─────────────── */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
            {step === 1 ? (
              <button
                type="button"
                onClick={handleSkip}
                className="flex-1 h-14 rounded-xl text-muted-foreground font-bold text-base hover:bg-muted transition-colors"
              >
                {t("customer:onboarding.skip", "Bỏ qua")}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 h-14 rounded-xl font-bold text-base border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 text-foreground"
              >
                <span className="material-symbols-outlined">arrow_back</span>
                Quay lại
              </button>
            )}

            {canGoNext ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-[2] h-14 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg shadow-primary/25 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                Tiếp theo
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="flex-[2] h-14 rounded-xl text-white font-bold text-base active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:brightness-105"
                style={{
                  backgroundColor: HEALTH_COLOR,
                  boxShadow: `0 8px 24px color-mix(in srgb, var(--health) 30%, transparent)`,
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
                {t("customer:onboarding.complete", "Hoàn tất thiết lập")}
              </button>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground text-center">
            Dữ liệu được mã hóa và chỉ dùng để cải thiện trải nghiệm. Bạn có thể chỉnh sửa bất cứ
            lúc nào trong{" "}
            <span className="font-semibold">Hồ sơ → Cài đặt sức khỏe</span>.
          </p>
        </div>
      </main>
    </div>
  );
};

export default OnboardingPage;