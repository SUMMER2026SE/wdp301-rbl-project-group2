import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import authService from "@/services/auth.service";
import logo from "@/assets/logo.png";

const ForgotPasswordPage = () => {
    const { t } = useTranslation(['auth', 'common']);
    const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirm_password, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await authService.forgotPassword({ email });
            setStep(2);
        } catch (err: any) {
            setError(err.response?.data?.message || t('auth:forgotPassword.emailNotFound'));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await authService.verifyPasswordResetOTP({ email, code: otp });
            setStep(3);
        } catch (err: any) {
            setError(err.response?.data?.message || "Mã xác thực không chính xác");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm_password) {
            setError(t('auth:resetPassword.passwordMismatch', 'Mật khẩu không khớp nhau'));
            return;
        }
        setLoading(true);
        setError("");
        try {
            await authService.resetPassword({
                email,
                code: otp,
                password,
                confirm_password
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.message || t('auth:resetPassword.invalidToken'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* Left: Visual Pane */}
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
                            {t('auth:forgotPassword.heroTitle', 'Đừng lo, chúng tôi sẽ giúp bạn lấy lại mật khẩu.')}
                        </h1>
                        <div className="h-1 w-20 bg-orange-500 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Right: Form */}
            <div className="w-full lg:w-2/5 flex flex-col justify-center items-center bg-card p-8 md:p-16 overflow-y-auto">
                <div className="w-full max-w-[420px] flex flex-col gap-8">
                    {/* Logo */}
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
                                {t('auth:forgotPassword.title')}
                            </h2>
                            <p className="text-muted-foreground text-base">
                                {t('auth:forgotPassword.subtitle')}
                            </p>
                        </div>
                    </div>

                    {success ? (
                        /* Complete Success State */
                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-4xl">check_circle</span>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-xl font-bold text-foreground">{t('auth:resetPassword.success')}</h3>
                                <p className="text-muted-foreground text-base">
                                    Mật khẩu của bạn đã được cập nhật thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.
                                </p>
                            </div>
                            <Link
                                to="/login"
                                className="flex w-full items-center justify-center rounded-lg h-12 px-5 bg-orange-600 text-white text-base font-bold transition-all hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-600/25"
                            >
                                {t('auth:forgotPassword.backToLogin')}
                            </Link>
                        </div>
                    ) : step === 3 ? (
                        /* Step 3: Enter New Password */
                        <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1 text-center mb-2">
                                <h3 className="text-xl font-bold">Đặt mật khẩu mới</h3>
                                <p className="text-muted-foreground text-sm">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-foreground text-sm font-semibold px-1">Mật khẩu mới</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-lg border border-input bg-background h-12 px-4 pr-12 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                        placeholder="Nhập mật khẩu mới"
                                        required
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-foreground text-sm font-semibold px-1">Xác nhận mật khẩu</label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={confirm_password}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full rounded-lg border border-input bg-background h-12 px-4 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                    placeholder="Nhập lại mật khẩu mới"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center rounded-lg h-12 px-5 bg-orange-600 text-white text-base font-bold transition-all hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    "Xác nhận thay đổi"
                                )}
                            </button>
                        </form>
                    ) : step === 2 ? (
                        /* Step 2: Enter OTP */
                        <form onSubmit={handleVerifyOTP} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1 text-center mb-2">
                                <p className="text-muted-foreground text-sm">
                                    {t('auth:forgotPassword.emailSent')}
                                </p>
                                <p className="text-foreground font-semibold">{email}</p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-foreground text-sm font-semibold px-1">Mã xác thực (OTP)</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="w-full rounded-lg border border-input bg-background h-12 px-4 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none text-center tracking-[0.5em] font-bold text-xl"
                                    placeholder="------"
                                    maxLength={6}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center rounded-lg h-12 px-5 bg-orange-600 text-white text-base font-bold transition-all hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    "Xác thực OTP"
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="text-center text-muted-foreground text-sm font-medium hover:text-foreground transition-colors underline underline-offset-4"
                            >
                                Thay đổi email
                            </button>
                        </form>
                    ) : (
                        /* Step 1: Enter Email */
                        <form onSubmit={handleSendOTP} className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-foreground text-sm font-semibold px-1">{t('auth:forgotPassword.email')}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-input bg-background h-12 px-4 text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                    placeholder={t('auth:forgotPassword.emailPlaceholder')}
                                    required
                                />
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                                    <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-2 flex w-full items-center justify-center rounded-lg h-12 px-5 bg-orange-600 text-white text-base font-bold transition-all hover:bg-orange-500 active:scale-[0.98] shadow-lg shadow-orange-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                ) : (
                                    t('auth:forgotPassword.submit')
                                )}
                            </button>

                            <Link
                                to="/login"
                                className="text-center text-orange-600 text-sm font-bold hover:text-orange-700 hover:underline"
                            >
                                {t('auth:forgotPassword.backToLogin')}
                            </Link>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
