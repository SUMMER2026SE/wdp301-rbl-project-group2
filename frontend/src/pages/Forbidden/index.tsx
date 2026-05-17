import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const jokes = [
    "Bạn không có quyền vào đây! 🔒 Giống như khách vào bếp — bị đuổi ra ngay!",
    "Khu vực VIP nè! Chỉ có đầu bếp trưởng mới vào được thôi! 👨‍🍳🚫",
    "Cửa bếp đã khóa! Bạn cần chìa khóa đặc biệt (quyền truy cập) mới mở được! 🗝️",
    "403 — Bạn bị cấm cửa rồi! Như gọi trà sữa mà quên mang tiền vậy! 🧋💸",
    "Ối! Trang này dành riêng cho người đặc biệt — và bạn chưa đặc biệt lắm! ⭐😅",
    "Bảo vệ nhà hàng nói: 'Xin lỗi, khu này reserved!' 🛑🍽️",
];

const ForbiddenPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated, role } = useAuth();
    const [joke] = useState(() => jokes[Math.floor(Math.random() * jokes.length)]);

    return (
        <div className="min-h-screen bg-[#f8f7f6] flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center">
                {/* Animated lock */}
                <div className="relative mb-8">
                    <div className="w-40 h-40 mx-auto bg-white rounded-full shadow-[0_8px_40px_rgba(239,68,68,0.15)] flex items-center justify-center border-4 border-red-200">
                        <span className="text-7xl select-none animate-bounce" style={{ animationDuration: "1.5s" }}>🔐</span>
                    </div>
                    <div className="absolute -top-2 -right-4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg -rotate-12 animate-pulse">
                        403
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl font-black text-[#1b140d] mb-4 tracking-tight">
                    Ê! Cấm vào nha!
                </h1>

                {/* Joke */}
                <div className="bg-white border-2 border-red-200 rounded-2xl p-5 mb-6 shadow-sm">
                    <p className="text-lg text-[#9a734c] font-medium leading-relaxed italic">
                        "{joke}"
                    </p>
                </div>

                {/* Info */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm text-red-700 font-semibold mb-2">⚠️ Bạn không có quyền truy cập trang này</p>
                    <ul className="text-sm text-red-600/80 space-y-1 list-disc list-inside">
                        <li>Tài khoản: <span className="font-bold">{isAuthenticated ? 'Đã đăng nhập' : 'Chưa đăng nhập'}</span></li>
                        {role && <li>Vai trò hiện tại: <span className="font-bold capitalize">{role.toLowerCase()}</span></li>}
                        <li>Trang này yêu cầu quyền truy cập cao hơn</li>
                    </ul>
                </div>

                {/* Subtext */}
                <p className="text-[#9a734c] mb-8 text-sm">
                    Nếu bạn tin rằng đây là lỗi, hãy liên hệ quản trị viên.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-xl border-2 border-[#e7dbcf] bg-white text-[#6b5744] font-bold hover:border-[orange-600] hover:text-[orange-600] transition-all"
                    >
                        ← Quay lại
                    </button>
                    <Link
                        to="/"
                        className="px-6 py-3 rounded-xl bg-[orange-600] text-white font-bold hover:bg-[#d97706] transition-all shadow-lg shadow-orange-500/25"
                    >
                        🏠 Về trang chủ
                    </Link>
                    {!isAuthenticated && (
                        <Link
                            to="/login"
                            className="px-6 py-3 rounded-xl border-2 border-[orange-600] text-[orange-600] font-bold hover:bg-[orange-600] hover:text-white transition-all"
                        >
                            🔑 Đăng nhập
                        </Link>
                    )}
                </div>

                {/* Fun footer */}
                <p className="mt-10 text-xs text-[#9a734c]/60">
                    Mã lỗi: 403 · Từ chối truy cập · FoodieDash © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default ForbiddenPage;
