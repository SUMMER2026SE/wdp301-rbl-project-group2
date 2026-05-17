import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import authService from "@/services/auth.service";
import { userService } from "@/services/profile.service";
import {
  PENDING_PREFS_KEY,
  type PendingPreferences,
} from "@/constants/preferences";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation(["auth", "common"]);
  const { login } = useAuth();
  const { mergeGuestCartIntoCurrentUser } = useCart();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authService.login({ email, password });
      // res = { success, data: BEUser, message }
      const user = res.data;
      if (!user) throw new Error("No user data");

      // Store user in Zustand (tokens are in httpOnly cookies)
      login({
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        verified_at: user.verified_at,
        collected_points: user.collected_points,
        addresses: user.addresses ?? [], // ← include delivery addresses
      });

      // Sau khi login, merge giỏ guest (nếu có) vào giỏ của user hiện tại
      mergeGuestCartIntoCurrentUser();

      // Sync onboarding preferences saved before login
      const pendingRaw = localStorage.getItem(PENDING_PREFS_KEY);
      if (pendingRaw) {
        try {
          const prefs = JSON.parse(pendingRaw) as PendingPreferences;
          await userService.updatePreferences(prefs);
        } catch {
          // preferences are non-critical — silently ignore
        } finally {
          localStorage.removeItem(PENDING_PREFS_KEY);
        }
      }

      // Delay navigation to let Zustand state propagate before route guards evaluate
      setTimeout(() => {
        const from = (location.state as { from?: { pathname: string } })?.from
          ?.pathname;
        if (from && from !== "/profile") {
          navigate(from, { replace: true });
        } else if (user.role === "ADMIN") {
          navigate("/admin");
        } else if (user.role === "STAFF") {
          navigate("/staff");
        } else {
          navigate("/");
        }
      }, 0);
    } catch (err: any) {
      const msg = err?.response?.data?.message || t("auth:login.loginFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left: Visual Pane (60%) */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-[#23170f]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.5)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuA81O2D9tSoFxEUm1s3HT_FA1Fe7jlURbAQeWecZnWeSBJvGfRy0woZUMt8HT1pBd_WJGIZUdscpbJulNaInv-ct4EACX_-2W2jY-EWDmN9Vl5bgCM3ifXYRp1_likq6ebQgIuFTTUejrpoh0CdGyYOzxgdWw1VBsedARwN7l_AXBxYjpEHWCfmLQn3W-kmXxE4vlB06q1ZHgoFOJ9d_oSeHgSmFlMtXY3QZA4kdc7PNDQ0kekJVA_Nz36Az3twZxp6Od-toSdgFRk")`,
          }}
        />
        <div className="relative z-10 flex flex-col justify-end p-16 w-full h-full">
          <div className="max-w-xl">
            <h1 className="text-white text-5xl font-black leading-tight tracking-tight mb-6">
              {t(
                "auth:login.heroTitle",
                "Ăn ngon, sống khỏe với gợi ý AI thông minh.",
              )}
            </h1>
            <div className="h-1 w-20 bg-orange-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right: Login Form (40%) */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center items-center bg-card p-8 md:p-16 overflow-y-auto">
        <div className="w-full max-w-[420px] flex flex-col gap-8">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center gap-4">
            <Link to="/" className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0">
              <img
                src={logo}
                alt="FoodieDash"
                className="h-18 -ml-8 -mr-12 object-contain group-hover:rotate-12 transition-transform duration-300"
              />
              <h1 className="text-2xl font-black tracking-tighter">FoodieDash</h1>
            </Link>
            <div className="flex flex-col gap-1">
              <h2 className="text-foreground text-3xl font-black tracking-tight">
                {t("auth:login.subtitle")}
              </h2>
              <p className="text-muted-foreground text-base">
                {t(
                  "auth:login.description",
                  "Vui lòng nhập thông tin để đăng nhập",
                )}
              </p>
            </div>
          </div>

          {/* Social Auth */}
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-semibold transition-all hover:bg-accent"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>{t("auth:login.google")}</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-3 w-full h-12 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-semibold transition-all hover:bg-accent"
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>{t("auth:login.facebook", "Tiếp tục với Facebook")}</span>
            </button>
          </div>

          {/* Separator */}
          <div className="flex items-center gap-4">
            <div className="h-px grow bg-border" />
            <span className="text-muted-foreground text-sm font-medium">
              {t("auth:login.orLoginWith")}
            </span>
            <div className="h-px grow bg-border" />
          </div>

          {/* Welcome banner after onboarding */}
          {(location.state as any)?.fromOnboarding && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <span
                className="material-symbols-outlined text-green-600 text-[20px] mt-0.5"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <div>
                <p className="text-green-700 dark:text-green-400 text-sm font-bold">
                  Thiết lập hồ sơ hoàn tất!
                </p>
                <p className="text-green-600 dark:text-green-500 text-xs mt-0.5">
                  Đăng nhập để bắt đầu trải nghiệm FoodieDash.
                </p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-foreground text-sm font-semibold px-1">
                {t("auth:login.email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background h-12 px-4 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                placeholder={t("auth:login.emailPlaceholder")}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-foreground text-sm font-semibold">
                  {t("auth:login.password")}
                </label>
                <Link
                  to="/forgot-password"
                  className="text-orange-600 text-sm font-bold hover:text-orange-700 hover:underline"
                >
                  {t("auth:login.forgotPassword")}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background h-12 px-4 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                  placeholder={t("auth:login.passwordPlaceholder")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <span className="material-symbols-outlined">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 px-1 mt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-orange-600 focus:ring-orange-500/20 accent-orange-600"
              />
              <span className="text-sm text-muted-foreground font-medium">
                {t("auth:login.rememberMe")}
              </span>
            </label>
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <span className="material-symbols-outlined text-red-500 text-[18px]">
                  error
                </span>
                <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full items-center justify-center rounded-lg h-12 px-5 bg-orange-600 text-white text-base font-bold transition-all hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
              ) : (
                t("auth:login.submit")
              )}
            </button>
          </form>

          {/* Footer Register Link */}
          <p className="text-center text-foreground text-sm font-medium mt-4">
            {t("auth:login.noAccount")}{" "}
            <Link
              to="/register"
              className="text-orange-600 font-bold hover:text-orange-700 hover:underline ml-1"
            >
              {t("auth:login.signUp")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
