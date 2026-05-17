import { Ticket, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";

// Định nghĩa Type chuẩn để bỏ @ts-ignore
type ThemeType = 'orange' | 'blue' | 'green';

interface Voucher {
    code: string;
    title: string;
    desc: string;
    expiry: string;
    theme: ThemeType;
    isSaved?: boolean;
}

const VoucherSection = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);

    // State giả lập việc "Lưu mã"
    const [savedVouchers, setSavedVouchers] = useState<string[]>([]);

    const vouchers: Voucher[] = [
        {
            code: "GIAM20K",
            title: "Giảm 20.000đ",
            desc: "Đơn tối thiểu 100k. Áp dụng toàn menu.",
            expiry: "Hết hạn: 2 ngày nữa",
            theme: "orange"
        },
        {
            code: "FREESHIP",
            title: "Freeship 0đ",
            desc: "Bán kính 5km. Tối đa 15k phí giao hàng.",
            expiry: "Hết hạn: Hôm nay",
            theme: "blue"
        },
        {
            code: "BANMOI",
            title: "Giảm 50%",
            desc: "Tối đa 30k cho khách hàng mới.",
            expiry: "Hết hạn: 30/05",
            theme: "green"
        },
    ];

    // Map class tĩnh cho Tailwind thay vì dùng split()
    const themeStyles = {
        orange: {
            headerBg: "bg-gradient-to-br from-orange-500 to-orange-400",
            iconBg: "bg-orange-600/30",
            badgeText: "text-orange-700",
            badgeBg: "bg-orange-100",
            btnDefault: "bg-orange-100 text-orange-700 hover:bg-orange-200",
            btnSaved: "bg-orange-500 text-white hover:bg-orange-600",
        },
        blue: {
            headerBg: "bg-gradient-to-br from-blue-500 to-blue-400",
            iconBg: "bg-blue-600/30",
            badgeText: "text-blue-700",
            badgeBg: "bg-blue-100",
            btnDefault: "bg-blue-100 text-blue-700 hover:bg-blue-200",
            btnSaved: "bg-blue-500 text-white hover:bg-blue-600",
        },
        green: {
            headerBg: "bg-gradient-to-br from-emerald-500 to-emerald-400",
            iconBg: "bg-emerald-600/30",
            badgeText: "text-emerald-700",
            badgeBg: "bg-emerald-100",
            btnDefault: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
            btnSaved: "bg-emerald-500 text-white hover:bg-emerald-600",
        },
    };

    const handleSaveVoucher = (e: React.MouseEvent, code: string) => {
        e.stopPropagation(); // Chặn sự kiện click nhảy sang trang chi tiết
        setSavedVouchers(prev =>
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

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

                    return (
                        <div
                            key={idx}
                            onClick={() => navigate(`/vouchers/${vc.code}`)}
                            className="relative flex flex-col bg-white rounded-[24px] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden border border-slate-100 group"
                        >
                            {/* Phần Header Vé (Nửa trên) */}
                            <div className={`relative p-5 ${styles.headerBg} text-white overflow-hidden`}>
                                {/* Pattern mờ */}
                                <div className="absolute right-[-10px] top-[-20px] opacity-10 rotate-12 pointer-events-none">
                                    <Ticket className="w-32 h-32" />
                                </div>

                                <div className="relative z-10 flex justify-between items-start">
                                    <div className={`px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-widest ${styles.badgeBg} ${styles.badgeText} shadow-sm`}>
                                        MÃ: {vc.code}
                                    </div>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md ${styles.iconBg}`}>
                                        <Ticket className="w-4 h-4 text-white" />
                                    </div>
                                </div>

                                <div className="relative z-10 mt-4">
                                    <h3 className="text-2xl font-black leading-tight drop-shadow-sm">{vc.title}</h3>
                                </div>
                            </div>

                            {/* Dải phân cách vé (Nét đứt + Lỗ tròn cắt) */}
                            <div className="relative h-4 w-full bg-white flex items-center">
                                {/* Lỗ tròn bên trái. Lưu ý: bg-slate-50 phải trùng với màu nền của trang (HomePage) */}
                                <div className="absolute -left-2 w-4 h-4 rounded-full bg-slate-50 border-r border-slate-200/50 z-10"></div>
                                <div className="w-full border-t-[1.5px] border-dashed border-slate-200 mx-3"></div>
                                {/* Lỗ tròn bên phải */}
                                <div className="absolute -right-2 w-4 h-4 rounded-full bg-slate-50 border-l border-slate-200/50 z-10"></div>
                            </div>

                            {/* Phần Chi tiết (Nửa dưới) */}
                            <div className="p-5 pt-2 flex flex-col flex-1 bg-white">
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