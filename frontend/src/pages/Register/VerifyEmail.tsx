import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import authService from "@/services/auth.service";

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from navigation state or local storage
  const email =
    location.state?.email || localStorage.getItem("pending_verify_email") || "";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await authService.verifyEmail({ email, code: fullCode });
      setSuccess(
        "Xác thực thành công! Đang chuyển hướng đến trang thiết lập hồ sơ...",
      );
      localStorage.removeItem("pending_verify_email");
      setTimeout(() => navigate("/onboarding", { state: { fromVerify: true, email } }), 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Mã xác thực không hợp lệ hoặc đã hết hạn",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setResending(true);
    setError("");
    try {
      await authService.resendVerifyEmail(email);
      setSuccess("Mã mới đã được gửi đến email của bạn");
      setTimer(60); // 60 seconds cooldown
    } catch (err: any) {
      setError(err?.response?.data?.message || "Không thể gửi lại mã");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 md:p-10">
        <div className="text-center mb-10">
          <div className="bg-orange-100 text-orange-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl">mail</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-2">
            Xác thực email
          </h1>
          <p className="text-slate-500">
            Chúng tôi đã gửi mã OTP gồm 6 chữ số đến <br />
            <span className="font-bold text-slate-800">{email}</span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2 rounded-r-lg">
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm flex items-center gap-2 rounded-r-lg">
            <span className="material-symbols-outlined text-lg">
              check_circle
            </span>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-between gap-2">
            {code.map((digit, idx) => (
              <input
                key={idx}
                id={`code-${idx}`}
                type="text"
                inputMode="numeric"
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 md:w-14 md:h-16 text-center text-2xl font-bold rounded-xl border-2 border-slate-200 focus:border-orange-500 focus:ring-0 transition-all outline-none"
                required
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? "Đang xác thực..." : "Xác thực ngay"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            Bạn không nhận được mã?{" "}
            <button
              onClick={handleResend}
              disabled={timer > 0 || resending}
              className="text-orange-600 font-bold hover:underline disabled:text-slate-400"
            >
              {resending
                ? "Đang gửi..."
                : timer > 0
                  ? `Gửi lại sau ${timer}s`
                  : "Gửi lại mã"}
            </button>
          </p>
          <button
            onClick={() => navigate("/register")}
            className="mt-6 text-slate-400 text-sm hover:text-slate-600 flex items-center justify-center gap-1 mx-auto"
          >
            <span className="material-symbols-outlined text-sm">
              arrow_back
            </span>
            Quay lại đăng ký
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
