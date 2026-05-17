import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import authService from "@/services/auth.service";
import logo from "@/assets/logo.png";

const HEALTH_COLOR = "var(--health)";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(["auth", "common"]);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [aiOptIn, setAiOptIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.register({
        username,
        email,
        password,
        confirm_password: confirmPassword,
      });
      // Redirect to OTP verification page
      localStorage.setItem("pending_verify_email", email);
      navigate("/verify-email", { state: { email } });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || t("auth:register.registerFailed");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left: Hero Imagery (60%) */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-[#e9d9ce]">
        <div
          className="absolute inset-0 bg-cover bg-center z-0 scale-105"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD1ne04eE7Ich6WIWlGhO_g_PYtba0lp6mXlUPB9QoSgDjREi6menZpGqFGOr2rsrb6d2DneuloUZPAZKcG0toXKTyMl3Naf10W4BngPAlYDdpizC2lAP5KYHPXYXej0raUci0yKFDNCA5Q-ZbtueAuox3rwcGAL9oqC0Rv7OP5qzbTlJHk8Y_64twMs1PDEcX3lgiwFRhTNXXb69PdneixXEqrH9q7xBYq1rZz2tvWAdpZvO4YTREAN98MajYHJbu1GDVahOz_k-g')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 z-10" />
        <div className="relative z-20 flex flex-col justify-between h-full p-16">
          <div className="flex items-center gap-3 text-white">
            <Link to="/" className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0">
              <img
                src={logo}
                alt="FoodieDash"
                className="h-18 -ml-8 -mr-12 object-contain group-hover:rotate-12 transition-transform duration-300"
              />
              <h1 className="text-2xl font-black tracking-tighter">FoodieDash</h1>
            </Link>
          </div>
          <div className="max-w-md">
            <h1 className="text-5xl font-extrabold text-white leading-tight mb-6">
              {t("auth:register.heroTitle", "Nuôi dưỡng cơ thể với")}{" "}
              <span className="text-orange-600">
                {t("auth:register.heroHighlight", "trí tuệ nhân tạo.")}
              </span>
            </h1>
            <p className="text-white/80 text-lg">
              {t(
                "auth:register.heroDescription",
                "Tham gia hàng ngàn thực khách quan tâm sức khỏe tin dùng AI của chúng tôi để thiết kế thực đơn dinh dưỡng hoàn hảo mỗi ngày.",
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Registration Form (40%) */}
      <div className="flex w-full lg:w-2/5 flex-col bg-card px-8 py-12 md:px-16 lg:px-20 justify-center overflow-y-auto">
        {/* Branding for Mobile */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <Link to="/" className="flex items-center gap-2.5 text-orange-600 hover:scale-105 transition-transform group shrink-0">
            <img
              src={logo}
              alt="FoodieDash"
              className="h-18 -ml-8 -mr-12 object-contain group-hover:rotate-12 transition-transform duration-300"
            />
            <h1 className="text-2xl font-black tracking-tighter">FoodieDash</h1>
          </Link>
        </div>

        {/* Page Heading */}
        <div className="mb-8">
          <h2 className="text-foreground text-3xl font-black leading-tight tracking-tight">
            {t("auth:register.title")}
          </h2>
          <p className="text-muted-foreground text-base font-normal mt-2">
            {t("auth:register.subtitle")}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2 rounded-r-lg">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">
              {t("auth:register.fullName")}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-transparent h-12 px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-muted-foreground/50 text-foreground"
              placeholder={t("auth:register.fullNamePlaceholder")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">
              {t("auth:register.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-transparent h-12 px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-muted-foreground/50 text-foreground"
              placeholder={t("auth:register.emailPlaceholder")}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">
              {t("auth:register.password")}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-transparent h-12 px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-muted-foreground/50 text-foreground"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-foreground text-sm font-semibold">
              Xác nhận mật khẩu
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-transparent h-12 px-4 text-base transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-muted-foreground/50 text-foreground"
              placeholder="••••••••"
              required
            />
          </div>

          {/* AI Health Integration Toggle */}
          <div
            className="flex items-start gap-3 p-4 rounded-lg border mt-6"
            style={{
              backgroundColor:
                "color-mix(in srgb, var(--health) 8%, transparent)",
              borderColor: "color-mix(in srgb, var(--health) 25%, transparent)",
            }}
          >
            <div className="pt-0.5">
              <input
                type="checkbox"
                id="ai-opt-in"
                checked={aiOptIn}
                onChange={(e) => setAiOptIn(e.target.checked)}
                className="size-5 rounded border-[var(--health)]/30 text-[var(--health)] focus:ring-[var(--health)]/20"
              />
            </div>
            <label className="cursor-pointer flex-1" htmlFor="ai-opt-in">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ color: HEALTH_COLOR }}
                >
                  auto_awesome
                </span>
                <span
                  className="text-sm font-bold uppercase tracking-wider"
                  style={{ color: HEALTH_COLOR }}
                >
                  {t("auth:register.aiPersonalize", "Cá nhân hóa AI")}
                </span>
              </div>
              <p className="text-xs text-foreground opacity-80 leading-relaxed">
                {t(
                  "auth:register.aiDescription",
                  "Tôi muốn AI cá nhân hóa món ăn dựa trên hồ sơ sức khỏe của mình.",
                )}
              </p>
            </label>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-lg h-14 px-6 bg-orange-600 hover:bg-orange-500 text-white text-base font-bold transition-all shadow-md shadow-orange-600/25 mt-4 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : t("auth:register.submit")}
          </button>
        </form>

        {/* Social Auth */}
        <div className="mt-10">
          <div className="relative flex items-center mb-8">
            <div className="flex-grow border-t border-border" />
            <span className="mx-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("auth:login.orLoginWith")}
            </span>
            <div className="flex-grow border-t border-border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent h-12 px-4 text-sm font-semibold hover:bg-accent transition-colors text-foreground"
            >
              <svg className="size-5" viewBox="0 0 24 24">
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
              <span>Google</span>
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-transparent h-12 px-4 text-sm font-semibold hover:bg-accent transition-colors text-foreground"
            >
              <svg className="size-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-10 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth:register.haveAccount")}{" "}
            <Link
              to="/login"
              className="text-orange-600 font-bold hover:text-orange-700 hover:underline ml-1"
            >
              {t("auth:register.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
