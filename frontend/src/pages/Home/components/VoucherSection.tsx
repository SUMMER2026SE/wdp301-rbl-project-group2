import { Ticket, Clock, CheckCircle2, ChevronRight, Percent, Truck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import voucherAPI from "@/services/voucher.service";
import type { Voucher } from "@/types/voucher";

// Định nghĩa Type chuẩn để bỏ @ts-ignore
type ThemeType = 'orange' | 'amber' | 'emerald' | 'rose';

interface UIVoucher {
    id: string;
    code: string;
    title: string;
    desc: string;
    expiry: string;
    theme: ThemeType;
    discount: string;
    discountType: string;
}

const VoucherSection = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);

    // State giả lập việc "Lưu mã"
    const [savedVouchers, setSavedVouchers] = useState<string[]>([]);

    // State dữ liệu thật
    const [vouchers, setVouchers] = useState<UIVoucher[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVouchers = async () => {
            try {
                // Fetch 3 active vouchers
                const res = await voucherAPI.getVouchers({ isActive: true, limit: 3 });
                if (res.success && res.data) {
                    const mapped = res.data.map((v: Voucher): UIVoucher => {
                        // Map category to visual theme
                        let theme: ThemeType = 'orange';
                        if (v.category === 'freeship') theme = 'amber';
                        if (v.category === 'newuser') theme = 'emerald';
                        if (v.category === 'special') theme = 'rose';

                        // Format date
                        const endDate = new Date(v.endAt);
                        const expiry = `Hết hạn: ${endDate.toLocaleDateString('vi-VN')}`;

                        // Format discount
                        const discount = v.discountType === 'percentage'
                            ? `${v.discountValue}%`
                            : `${(v.discountValue / 1000).toFixed(0)}K`;

                        return {
                            id: v._id,
                            code: v.code,
                            title: v.title,
                            desc: v.description,
                            expiry,
                            theme,
                            discount,
                            discountType: v.discountType,
                        };
                    });
                    setVouchers(mapped);
                }
            } catch (error) {
                console.error("Failed to fetch vouchers", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVouchers();
    }, []);

    // Map class tĩnh cho Tailwind
    const themeStyles = {
        orange: {
            gradient: "from-orange-500 to-amber-500",
            iconBg: "bg-orange-600/20",
            badgeText: "text-orange-700",
            badgeBg: "bg-orange-100",
            btnDefault: "bg-orange-50 text-orange-700 hover:bg-orange-100/80",
            btnSaved: "bg-orange-500 text-white hover:bg-orange-600",
            icon: Percent,
        },
        amber: {
            gradient: "from-blue-500 to-cyan-500",
            iconBg: "bg-blue-600/20",
            badgeText: "text-blue-700",
            badgeBg: "bg-blue-100",
            btnDefault: "bg-blue-50 text-blue-700 hover:bg-blue-100/80",
            btnSaved: "bg-blue-500 text-white hover:bg-blue-600",
            icon: Truck,
        },
        emerald: {
            gradient: "from-violet-500 to-purple-500",
            iconBg: "bg-violet-600/20",
            badgeText: "text-violet-700",
            badgeBg: "bg-violet-100",
            btnDefault: "bg-violet-50 text-violet-700 hover:bg-violet-100/80",
            btnSaved: "bg-violet-500 text-white hover:bg-violet-600",
            icon: Sparkles,
        },
        rose: {
            gradient: "from-rose-500 to-pink-500",
            iconBg: "bg-rose-600/20",
            badgeText: "text-rose-700",
            badgeBg: "bg-rose-100",
            btnDefault: "bg-rose-50 text-rose-700 hover:bg-rose-100/80",
            btnSaved: "bg-rose-500 text-white hover:bg-rose-600",
            icon: Ticket,
        },
    };

    const handleSaveVoucher = (e: React.MouseEvent, code: string) => {
        e.stopPropagation(); // Chặn sự kiện click nhảy sang trang chi tiết
        setSavedVouchers(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    if (!loading && vouchers.length === 0) {
        return null;
    }

    if (loading) {
        return null; // Or you can render a skeleton if preferred
    }

    return (
        <section className="w-full">
            <div className="flex items-end justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100/80 p-2.5 rounded-xl border border-orange-200/50">
                        <Ticket className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                            {t('customer:voucher.title', 'Ví Voucher của bạn')}
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Lưu ngay kẻo lỡ deal hời hôm nay</p>
                    </div>
                </div>
                <Link
                    to="/vouchers"
                    className="hidden sm:flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors group"
                >
                    {t('customer:voucher.myVouchers', 'Xem tất cả')}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {vouchers.map((vc, idx) => {
                    const styles = themeStyles[vc.theme];
                    const isSaved = savedVouchers.includes(vc.code);
                    const IconComp = styles.icon;

                    return (
                        <div
                            key={idx}
                            onClick={() => navigate(`/vouchers/${vc.id || vc.code}`)}
                            className="relative flex flex-col bg-white rounded-[24px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-slate-100 group"
                        >
                            {/* Phần Header Vé (Nửa trên) */}
                            <div className={`relative p-5 bg-gradient-to-br ${styles.gradient} text-white overflow-hidden`}>
                                {/* Background pattern */}
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="absolute -right-4 -top-4 w-20 h-20 border-[2px] border-white rounded-full" />
                                    <div className="absolute -left-3 -bottom-3 w-16 h-16 border-[2px] border-white rounded-full" />
                                </div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest ${styles.badgeBg} ${styles.badgeText} shadow-sm`}>
                                        MÃ: {vc.code}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${styles.iconBg}`}>
                                        <IconComp className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                <div className="relative z-10 mt-3 flex items-end justify-between">
                                    <h3 className="text-lg font-black leading-tight drop-shadow-sm flex-1 mr-3">{vc.title}</h3>
                                    <div className="text-right shrink-0">
                                        <div className="text-3xl font-black leading-none drop-shadow-md">{vc.discount}</div>
                                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-70 mt-0.5">Giảm</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dải phân cách vé (Nét đứt + Lỗ tròn cắt) */}
                            <div className="relative h-5 w-full bg-white flex items-center">
                                {/* Lỗ tròn bên trái */}
                                <div className="absolute -left-2.5 w-5 h-5 rounded-full bg-slate-50 border-r border-slate-200/60 z-10" />
                                <div className="w-full border-t-[1.5px] border-dashed border-slate-200 mx-4" />
                                {/* Lỗ tròn bên phải */}
                                <div className="absolute -right-2.5 w-5 h-5 rounded-full bg-slate-50 border-l border-slate-200/60 z-10" />
                            </div>

                            {/* Phần Chi tiết (Nửa dưới) */}
                            <div className="p-5 pt-1 flex flex-col flex-1 bg-white">
                                <p className="text-[13px] text-slate-500 font-medium line-clamp-2 leading-relaxed mb-4 flex-1">
                                    {vc.desc}
                                </p>

                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        {vc.expiry}
                                    </div>

                                    <Button
                                        onClick={(e) => handleSaveVoucher(e, vc.code)}
                                        className={`h-9 px-4 rounded-xl font-bold transition-all shadow-none ${isSaved ? styles.btnSaved : styles.btnDefault}`}
                                    >
                                        {isSaved ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Đã lưu
                                            </>
                                        ) : 'Lưu mã'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Nút Xem tất cả cho Mobile */}
            <Link
                to="/vouchers"
                className="mt-6 flex sm:hidden items-center justify-center w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
                {t('customer:voucher.myVouchers', 'Xem tất cả Voucher')}
            </Link>
        </section>
    );
};

export default VoucherSection;
