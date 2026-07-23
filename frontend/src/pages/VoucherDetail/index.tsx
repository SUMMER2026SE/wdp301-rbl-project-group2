import { useState, useEffect } from "react";
import {
    ArrowLeft,
    Copy,
    Check,
    Clock,
    Tag,
    AlertCircle,
    CheckCircle2,
    Info,
    Share2,
    Bookmark,
    Loader2,
    ShoppingBag,
    Users,
    Percent,
    Truck,
    Sparkles,
    Gift,
    ChevronRight,
    Flame,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import voucherAPI from "@/services/voucher.service";
import type { Voucher } from "@/types/voucher";
import { useTranslation } from "react-i18next";

/* ────── Category themes ────── */
const categoryConfig: Record<string, {
    gradient: string;
    gradientLight: string;
    icon: typeof Percent;
    label: string;
    text: string;
}> = {
    discount: {
        gradient: "from-orange-500 to-amber-500",
        gradientLight: "from-orange-50 to-amber-50",
        icon: Percent,
        label: "Voucher giảm giá",
        text: "text-orange-600",
    },
    freeship: {
        gradient: "from-blue-500 to-cyan-500",
        gradientLight: "from-blue-50 to-cyan-50",
        icon: Truck,
        label: "Voucher freeship",
        text: "text-blue-600",
    },
    newuser: {
        gradient: "from-violet-500 to-purple-500",
        gradientLight: "from-violet-50 to-purple-50",
        icon: Sparkles,
        label: "Voucher người mới",
        text: "text-violet-600",
    },
    special: {
        gradient: "from-rose-500 to-pink-500",
        gradientLight: "from-rose-50 to-pink-50",
        icon: Gift,
        label: "Voucher đặc biệt",
        text: "text-rose-600",
    },
};

const VoucherDetailPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);
    const { id } = useParams<{ id: string }>();
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [relatedVouchers, setRelatedVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVoucherDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await voucherAPI.getVoucherById(id!);
            setVoucher(response.data);

            // Fetch related vouchers (same category)
            try {
                const relatedRes = await voucherAPI.getVouchers({
                    category: response.data.category,
                    isActive: true,
                    limit: 4,
                });
                // Exclude current voucher
                setRelatedVouchers(
                    relatedRes.data.filter((v: Voucher) => v._id !== response.data._id).slice(0, 3)
                );
            } catch {
                // Silently ignore — related vouchers are non-critical
            }
        } catch (err: any) {
            setError(err.response?.data?.message || "Không thể tải thông tin voucher");
            console.error("Error fetching voucher:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) {
            fetchVoucherDetail();
        }
    }, [id]);

    const handleCopy = () => {
        if (voucher) {
            navigator.clipboard.writeText(voucher.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSave = () => {
        setSaved(!saved);
        // TODO: Call API to save/unsave voucher
    };

    const formatDiscount = () => {
        if (!voucher) return "";
        if (voucher.discountType === "percentage") {
            return `${voucher.discountValue}%`;
        }
        return `${voucher.discountValue.toLocaleString()}đ`;
    };

    const formatDiscountShort = (v: Voucher) => {
        if (v.discountType === "percentage") return `${v.discountValue}%`;
        return `${(v.discountValue / 1000).toFixed(0)}K`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };

    const getCountdown = (dateString: string) => {
        const now = new Date();
        const end = new Date(dateString);
        const diff = end.getTime() - now.getTime();
        if (diff <= 0) return { days: 0, hours: 0, expired: true };
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        return { days, hours, expired: false };
    };

    const getUsagePercent = (v: Voucher) => {
        if (!v.usageLimit) return 0;
        return Math.min(100, Math.round((v.usedCount / v.usageLimit) * 100));
    };

    // Default instructions
    const instructions = [
        "Chọn món ăn yêu thích và thêm vào giỏ hàng",
        "Tại trang thanh toán, nhấn vào 'Áp dụng mã giảm giá'",
        "Nhập mã voucher hoặc chọn từ danh sách đã lưu",
        "Kiểm tra giá trị giảm và hoàn tất đơn hàng",
    ];

    // Default benefits
    const benefits = voucher
        ? [
            `Tiết kiệm ngay ${formatDiscount()} cho mỗi đơn hàng`,
            "Áp dụng linh hoạt cho nhiều loại món ăn",
            `Sử dụng tối đa ${voucher.usageLimit ?? "không giới hạn"} lần`,
            voucher.isStackable ? "Có thể kết hợp với voucher khác" : "Không kết hợp với voucher khác",
        ]
        : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Đang tải voucher...</p>
                </div>
            </div>
        );
    }

    if (error || !voucher) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Có lỗi xảy ra</h2>
                    <p className="text-slate-500 mb-6 text-sm">{error || "Không tìm thấy voucher"}</p>
                    <Button onClick={() => navigate("/vouchers")} className="bg-slate-900 hover:bg-slate-800 rounded-xl px-6">
                        Quay lại danh sách
                    </Button>
                </div>
            </div>
        );
    }

    const config = categoryConfig[voucher.category] || categoryConfig.discount;
    const CatIcon = config.icon;
    const countdown = getCountdown(voucher.endAt);
    const usagePercent = getUsagePercent(voucher);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ── HEADER ── */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-4 md:px-8 py-3.5">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors group"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-semibold text-sm">{t('customer:voucherDetail.back')}</span>
                        </button>
                        <div className="flex items-center gap-1">
                            <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                                <Share2 className="w-4.5 h-4.5 text-slate-500" />
                            </button>
                            <button
                                onClick={handleSave}
                                className={`p-2.5 hover:bg-slate-100 rounded-xl transition-colors ${saved ? "text-orange-600" : "text-slate-500"}`}
                            >
                                <Bookmark className={`w-4.5 h-4.5 ${saved ? "fill-orange-600" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-5">
                {/* ── HERO VOUCHER CARD ── */}
                <div className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/60 border border-slate-100">
                    <div className="flex flex-col md:flex-row">
                        {/* Left: Discount Panel */}
                        <div className={`relative md:w-[220px] shrink-0 bg-gradient-to-br ${config.gradient} text-white p-8 md:p-10 flex flex-col items-center justify-center overflow-hidden`}>
                            {/* Background circles */}
                            <div className="absolute inset-0 opacity-10 pointer-events-none">
                                <div className="absolute -right-8 -top-8 w-32 h-32 border-[3px] border-white rounded-full" />
                                <div className="absolute -left-10 -bottom-10 w-40 h-40 border-[3px] border-white rounded-full" />
                                <div className="absolute right-4 bottom-4 w-16 h-16 border-[2px] border-white rounded-full" />
                            </div>

                            <div className="relative z-10 text-center">
                                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm border border-white/30 text-[10px] font-bold uppercase tracking-[0.15em] px-3 py-1 rounded-full mb-4">
                                    <CatIcon className="w-3 h-3" />
                                    {config.label}
                                </div>
                                <div className="text-5xl md:text-6xl font-black tracking-tight leading-none drop-shadow-md">
                                    {formatDiscount()}
                                </div>
                                <div className="text-xs font-bold uppercase tracking-[0.2em] mt-2 opacity-80">
                                    Giảm giá
                                </div>
                            </div>
                        </div>

                        {/* Perforation edge (visible on md+) */}
                        <div className="hidden md:block relative w-0 shrink-0">
                            <div className="absolute -top-3 -translate-x-1/2 w-6 h-6 bg-slate-50 rounded-full z-10" />
                            <div className="absolute -bottom-3 -translate-x-1/2 w-6 h-6 bg-slate-50 rounded-full z-10" />
                            <div className="absolute top-4 bottom-4 left-0 -translate-x-[0.5px] border-l-[2px] border-dashed border-slate-200" />
                        </div>
                        {/* Horizontal perforation (mobile) */}
                        <div className="md:hidden relative h-0">
                            <div className="absolute -left-3 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full z-10" />
                            <div className="absolute -right-3 -translate-y-1/2 w-6 h-6 bg-slate-50 rounded-full z-10" />
                            <div className="absolute left-4 right-4 top-0 -translate-y-[0.5px] border-t-[2px] border-dashed border-slate-200" />
                        </div>

                        {/* Right: Info Panel */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                            <div>
                                <h1 className="text-2xl md:text-[26px] font-black text-slate-900 leading-tight mb-2">
                                    {voucher.title}
                                </h1>
                                <p className="text-sm text-slate-500 leading-relaxed mb-5">
                                    {voucher.description}
                                </p>

                                {/* Code Section */}
                                <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 mb-5">
                                    <div>
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                                            {t('customer:voucherDetail.voucherCode')}
                                        </p>
                                        <p className="text-xl font-black font-mono text-slate-800 tracking-[0.1em]">
                                            {voucher.code}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleCopy}
                                        className={`flex items-center gap-2 font-bold px-5 py-2.5 rounded-xl text-sm transition-all active:scale-95 ${copied
                                            ? "bg-emerald-500 text-white"
                                            : "bg-slate-900 text-white hover:bg-slate-800"
                                            }`}
                                    >
                                        {copied ? (
                                            <><Check className="w-4 h-4" />{t('customer:voucherDetail.copied')}</>
                                        ) : (
                                            <><Copy className="w-4 h-4" />{t('customer:voucherDetail.copy')}</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* CTA */}
                            <Button
                                onClick={() => navigate("/menu")}
                                className={`w-full h-12 bg-gradient-to-r ${config.gradient} hover:opacity-90 text-white font-bold text-base rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]`}
                            >
                                {t('customer:voucherDetail.useNow')}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* ── INFO METRICS GRID ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Discount Value */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className="w-9 h-9 bg-orange-50 rounded-xl flex items-center justify-center mb-3">
                            <Tag className="w-4.5 h-4.5 text-orange-500" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {t('customer:voucherDetail.discountValue')}
                        </p>
                        <p className="text-lg font-black text-slate-900">{formatDiscount()}</p>
                    </div>

                    {/* Min Order */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center mb-3">
                            <ShoppingBag className="w-4.5 h-4.5 text-blue-500" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {t('customer:voucherDetail.minOrder')}
                        </p>
                        <p className="text-lg font-black text-slate-900">
                            {voucher.minOrderValue.toLocaleString()}đ
                        </p>
                    </div>

                    {/* Expiry / Countdown */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${countdown.expired || countdown.days <= 3 ? 'bg-red-50' : 'bg-emerald-50'}`}>
                            <Clock className={`w-4.5 h-4.5 ${countdown.expired || countdown.days <= 3 ? 'text-red-500' : 'text-emerald-500'}`} />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {t('customer:voucherDetail.expires')}
                        </p>
                        {countdown.expired ? (
                            <p className="text-sm font-bold text-red-600">Đã hết hạn</p>
                        ) : countdown.days <= 7 ? (
                            <p className={`text-sm font-bold ${countdown.days <= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                                {countdown.days > 0 ? `${countdown.days} ngày ${countdown.hours}h` : `${countdown.hours} giờ`}
                            </p>
                        ) : (
                            <p className="text-sm font-bold text-slate-700">{formatDate(voucher.endAt)}</p>
                        )}
                    </div>

                    {/* Usage */}
                    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                        <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                            <Users className="w-4.5 h-4.5 text-violet-500" />
                        </div>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
                            {t('customer:voucherDetail.used')}
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                            {voucher.usedCount}{voucher.usageLimit ? `/${voucher.usageLimit}` : ""} lần
                        </p>
                        {voucher.usageLimit && (
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                                <div
                                    className={`h-full rounded-full transition-all ${usagePercent >= 80
                                        ? "bg-gradient-to-r from-red-400 to-red-500"
                                        : "bg-gradient-to-r from-violet-400 to-violet-500"
                                        }`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── BENEFITS ── */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{t('customer:voucherDetail.benefits')}</h2>
                    </div>
                    <div className="space-y-3">
                        {benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-5 h-5 bg-emerald-50 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{benefit}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── HOW TO USE ── */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Info className="w-5 h-5 text-blue-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{t('customer:voucherDetail.howToUse')}</h2>
                    </div>
                    <div className="space-y-4">
                        {instructions.map((instruction, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center shrink-0 shadow-sm`}>
                                    <span className="text-white font-bold text-xs">{idx + 1}</span>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed pt-1">{instruction}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── TERMS & CONDITIONS ── */}
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-500" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900">{t('customer:voucherDetail.terms')}</h2>
                    </div>
                    <div className="space-y-2.5">
                        {(voucher.conditions ?? []).map((term, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0 mt-2" />
                                <p className="text-sm text-slate-500 leading-relaxed">{term}</p>
                            </div>
                        ))}
                        {(!voucher.conditions || voucher.conditions.length === 0) && (
                            <p className="text-slate-400 text-sm">Không có điều khoản đặc biệt.</p>
                        )}
                    </div>
                </div>

                {/* ── RELATED VOUCHERS ── */}
                {relatedVouchers.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" />
                                Voucher tương tự
                            </h2>
                            <button
                                onClick={() => navigate("/vouchers")}
                                className="text-sm font-bold text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1"
                            >
                                Xem tất cả
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {relatedVouchers.map((rv) => {
                                const rvConfig = categoryConfig[rv.category] || categoryConfig.discount;
                                const RvIcon = rvConfig.icon;
                                return (
                                    <div
                                        key={rv._id}
                                        onClick={() => navigate(`/vouchers/${rv._id}`)}
                                        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group"
                                    >
                                        <div className={`bg-gradient-to-br ${rvConfig.gradient} p-4 text-white relative overflow-hidden`}>
                                            <div className="absolute -right-2 -top-2 opacity-10">
                                                <RvIcon className="w-16 h-16" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="text-2xl font-black">{formatDiscountShort(rv)}</div>
                                                <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mt-0.5">
                                                    {rvConfig.label}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="font-bold text-slate-900 text-sm truncate group-hover:text-orange-600 transition-colors">
                                                {rv.title}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-slate-400 font-medium">
                                                <Clock className="w-3 h-3" />
                                                HSD: {formatDate(rv.endAt)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── BOTTOM CTA ── */}
                <div className={`bg-gradient-to-r ${config.gradient} rounded-2xl p-6 text-center relative overflow-hidden`}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none">
                        <div className="absolute -right-8 -top-8 w-32 h-32 border-[3px] border-white rounded-full" />
                        <div className="absolute -left-6 -bottom-6 w-24 h-24 border-[3px] border-white rounded-full" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-white/90 text-sm mb-3 font-medium">Đừng bỏ lỡ cơ hội tiết kiệm!</p>
                        <Button
                            onClick={() => navigate("/menu")}
                            className="bg-white text-slate-900 hover:bg-slate-50 font-bold h-12 px-8 rounded-xl shadow-lg active:scale-95 transition-all"
                        >
                            {t('customer:voucherDetail.applyNow')}
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VoucherDetailPage;
