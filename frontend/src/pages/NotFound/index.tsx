import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const jokes = [
    "Bạn đã lạc vào bếp bí mật rồi! 🍳 Ở đây không có món nào đâu...",
    "404 — Món ăn này đã bị... ăn hết! 🍜 Không còn gì để xem.",
    "Ối! Shipper giao nhầm trang rồi! 🛵💨 Trang bạn tìm không có ở đây.",
    "Đầu bếp đã nghỉ rồi, trang này đã đóng cửa! 👨‍🍳💤",
    "Hmm... trang này giòn tan như nem rán — biến mất không dấu vết! 🥟",
    "Bạn tìm gì vậy? Ở đây chỉ có... hư vô và mùi phở thôi! 🍲✨",
];

const NotFoundPage = () => {
    const navigate = useNavigate();
    const [joke] = useState(() => jokes[Math.floor(Math.random() * jokes.length)]);
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) { navigate("/"); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-[#f8f7f6] flex items-center justify-center p-6">
            <div className="max-w-lg w-full text-center">
                {/* Animated plate */}
                <div className="relative mb-8">
                    <div className="w-40 h-40 mx-auto bg-white rounded-full shadow-[0_8px_40px_rgba(238,140,43,0.2)] flex items-center justify-center border-4 border-[#e7dbcf] animate-bounce" style={{ animationDuration: "2s" }}>
                        <span className="text-7xl select-none">🍽️</span>
                    </div>
                    <div className="absolute -top-2 -right-4 w-16 h-16 bg-[orange-600] rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg rotate-12 animate-pulse">
                        404
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-5xl font-black text-[#1b140d] mb-4 tracking-tight">
                    Ôi! Lạc đường rồi!
                </h1>

                {/* Joke */}
                <div className="bg-white border-2 border-[#e7dbcf] rounded-2xl p-5 mb-6 shadow-sm">
                    <p className="text-lg text-[#9a734c] font-medium leading-relaxed italic">
                        "{joke}"
                    </p>
                </div>

                {/* Subtext */}
                <p className="text-[#9a734c] mb-8 text-sm">
                    Trang bạn đang tìm không tồn tại hoặc đã bị di chuyển.
                    <br />
                    Tự động quay về trang chủ sau <span className="font-bold text-[orange-600]">{countdown}s</span>
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
                    <Link
                        to="/menu"
                        className="px-6 py-3 rounded-xl border-2 border-[orange-600] text-[orange-600] font-bold hover:bg-[orange-600] hover:text-white transition-all"
                    >
                        🍜 Xem thực đơn
                    </Link>
                </div>

                {/* Fun footer */}
                <p className="mt-10 text-xs text-[#9a734c]/60">
                    Mã lỗi: 404 · Trang không tìm thấy · FoodieDash © {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
};

export default NotFoundPage;
