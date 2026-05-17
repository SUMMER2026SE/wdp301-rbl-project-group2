import { Gift, ArrowRight, Sparkles, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

const LoyaltySection = () => {
    const { user, isAuthenticated } = useAuthStore();

    // Logic tính toán hạng và điểm thực tế
    const currentPoints = user?.collected_points || 0;

    const getTierInfo = (points: number) => {
        if (points >= 5000) return { name: "Thành viên Bạch Kim", target: 10000, nextReward: "Voucher 500k" };
        if (points >= 2000) return { name: "Thành viên Vàng", target: 5000, nextReward: "Buffet miễn phí" };
        if (points >= 500) return { name: "Thành viên Bạc", target: 2000, nextReward: "Món phụ đặc biệt" };
        return { name: "Thành viên Đồng", target: 500, nextReward: "Nước Sâm Thảo Mộc" };
    };

    const tier = getTierInfo(currentPoints);
    const progressPercentage = Math.min(100, Math.round((currentPoints / tier.target) * 100));
    const pointsNeeded = tier.target - currentPoints;

    return (
        <section className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 text-white shadow-2xl group border border-slate-800">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/20 to-rose-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-[60px] translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="absolute -right-8 -top-8 p-12 opacity-[0.03] rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <Gift className="w-80 h-80" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 p-8 sm:p-10 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12">

                <div className="flex-1 w-full">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-400 mb-4 font-bold uppercase tracking-widest text-[11px] px-3 py-1.5 rounded-full shadow-lg">
                        <Crown className="w-3.5 h-3.5" />
                        {isAuthenticated ? tier.name : "Thành viên mới"}
                    </div>

                    <h2 className="text-3xl sm:text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300 tracking-tight">
                        Ăn ngon tích điểm <br className="hidden sm:block" />Đổi quà thả ga
                    </h2>

                    <p className="text-slate-400 text-sm sm:text-base mb-8 max-w-md leading-relaxed">
                        {!isAuthenticated ? (
                            "Đăng nhập ngay để bắt đầu hành trình tích điểm và nhận những ưu đãi đặc biệt dành riêng cho thành viên!"
                        ) : (
                            <>
                                Chỉ còn thiếu <strong className="text-amber-400">{pointsNeeded} điểm</strong> nữa để đổi ngay một món <strong className="text-white">{tier.nextReward}</strong> mát lạnh miễn phí!
                            </>
                        )}
                    </p>

                    {/* Progress Bar Area */}
                    <div className="w-full max-w-md">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Tiến trình đổi quà
                            </span>
                            <span className="text-xs font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                                {currentPoints} / {tier.target}
                            </span>
                        </div>

                        <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner relative border border-slate-700">
                            <div
                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Call to Action Button */}
                <div className="w-full md:w-auto shrink-0 flex justify-center">
                    <Link to={isAuthenticated ? "/profile/wallet" : "/login"}>
                        <button className="group/btn relative overflow-hidden bg-white text-slate-900 font-black h-14 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-orange-500/20 flex items-center gap-2 w-full md:w-auto justify-center">
                            <span className="relative z-10 flex items-center gap-2">
                                {isAuthenticated ? "Khám Phá Kho Quà" : "Đăng Nhập Ngay"}
                                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </span>
                            {/* Nền hover trượt từ dưới lên */}
                            <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-amber-400 to-orange-400 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-in-out z-0" />
                            {/* Đổi màu chữ khi hover vào nền cam */}
                            <span className="absolute z-10 flex items-center gap-2 text-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300">
                                {isAuthenticated ? "Khám Phá Kho Quà" : "Đăng Nhập Ngay"}
                                <ArrowRight className="w-5 h-5 translate-x-1" />
                            </span>
                        </button>
                    </Link>
                </div>

            </div>
        </section>
    );
};

export default LoyaltySection;