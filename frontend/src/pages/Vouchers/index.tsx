import { useState, useEffect, useMemo } from "react";
import {
    Ticket,
    Gift,
    Truck,
    Percent,
    Copy,
    Check,
    Sparkles,
    ArrowLeft,
    Search,
    Clock,
    Star,
    Users,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import voucherAPI from "@/services/voucher.service";
import type { Voucher, VoucherCategory } from "@/types/voucher";
import { useTranslation } from "react-i18next";

/* ────── Category theme definitions ────── */
const categoryThemes: Record<string, {
    gradient: string;
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
    icon: typeof Percent;
    label: string;
    pillActive: string;
}> = {
    discount: {
        gradient: "from-orange-500 to-amber-500",
        bg: "bg-orange-50",
        text: "text-orange-600",
        border: "border-orange-200",
        badgeBg: "bg-orange-100",
        icon: Percent,
        label: "Giảm giá",
        pillActive: "from-orange-500 to-amber-500",
    },
    freeship: {
        gradient: "from-blue-500 to-cyan-500",
        bg: "bg-blue-50",
        text: "text-blue-600",
        border: "border-blue-200",
        badgeBg: "bg-blue-100",
        icon: Truck,
        label: "Freeship",
        pillActive: "from-blue-500 to-cyan-500",
    },
    newuser: {
        gradient: "from-violet-500 to-purple-500",
        bg: "bg-violet-50",
        text: "text-violet-600",
        border: "border-violet-200",
        badgeBg: "bg-violet-100",
        icon: Sparkles,
        label: "Người mới",
        pillActive: "from-violet-500 to-purple-500",
    },
    special: {
        gradient: "from-rose-500 to-pink-500",
        bg: "bg-rose-50",
        text: "text-rose-600",
        border: "border-rose-200",
        badgeBg: "bg-rose-100",
        icon: Gift,
        label: "Đặc biệt",
        pillActive: "from-rose-500 to-pink-500",
    },
};

const categories = [
    { id: "all", name: "Tất cả", icon: Star },
    { id: "discount", name: "Giảm giá", icon: Percent },
    { id: "freeship", name: "Freeship", icon: Truck },
    { id: "newuser", name: "Người mới", icon: Sparkles },
    { id: "special", name: "Đặc biệt", icon: Gift },
];

const VouchersPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            setError(null);

            const params: any = {
                isActive: true,
                limit: 20,
            };

            if (activeCategory !== "all") {
                params.category = activeCategory as VoucherCategory;
            }

            const response = await voucherAPI.getVouchers(params);
            setVouchers(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Không thể tải vouchers");
            console.error("Error fetching vouchers:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, [activeCategory]);

    const handleCopy = (e: React.MouseEvent, code: string) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const formatDiscount = (voucher: Voucher) => {
        if (voucher.discountType === "percentage") {
            return `${voucher.discountValue}%`;
        }
        return `${(voucher.discountValue / 1000).toFixed(0)}K`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    const getDaysLeft = (dateString: string) => {
        const now = new Date();
        const end = new Date(dateString);
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const getUsagePercent = (voucher: Voucher) => {
        if (!voucher.usageLimit) return 0;
        return Math.min(100, Math.round((voucher.usedCount / voucher.usageLimit) * 100));
    };

    const filteredVouchers = useMemo(() => {
        if (!searchQuery.trim()) return vouchers;
        const lowerQuery = searchQuery.toLowerCase();
        return vouchers.filter(v =>
            v.code.toLowerCase().includes(lowerQuery) ||
            v.title.toLowerCase().includes(lowerQuery)
        );
    }, [vouchers, searchQuery]);

    const getTheme = (category: string) => categoryThemes[category] || categoryThemes.discount;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/80 font-sans text-slate-900">
            {/* ── HEADER ── */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                                    {t('customer:voucher.title', 'Kho Voucher')}
                                </h1>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    {loading
                                        ? "Đang tải..."
                                        : `${vouchers.length} voucher khả dụng`}
                                </p>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-64 hidden sm:block">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Tìm mã voucher..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* ── Mobile Search ── */}
                <div className="relative sm:hidden">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm mã voucher..."
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-400 shadow-sm"
                    />
                </div>

                {/* ── CATEGORY PILLS ── */}
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
                    {categories.map(cat => {
                        const isActive = activeCategory === cat.id;
                        const CatIcon = cat.icon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`whitespace-nowrap flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${isActive
                                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25"
                                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 hover:shadow-sm"
                                    }`}
                            >
                                <CatIcon className="w-4 h-4" />
                                {cat.name}
                            </button>
                        );
                    })}
                </div>

                {/* ── LOADING SKELETON ── */}
                {loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse flex h-[160px]">
                                <div className="w-[130px] bg-slate-200 shrink-0" />
                                <div className="flex-1 p-5 space-y-3">
                                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                                    <div className="h-8 bg-slate-100 rounded w-2/3 mt-4" />
                                    <div className="h-2 bg-slate-100 rounded w-full mt-2" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── ERROR STATE ── */}
                {error && !loading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-red-100">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ticket className="w-10 h-10 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Không thể tải dữ liệu</h3>
                        <p className="text-slate-500 mb-6 text-sm">{error}</p>
                        <Button onClick={fetchVouchers} className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8">
                            Thử lại ngay
                        </Button>
                    </div>
                )}

                {/* ── VOUCHER LIST ── */}
                {!loading && !error && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {filteredVouchers.map((voucher) => {
                            const theme = getTheme(voucher.category);
                            const IconComp = theme.icon;
                            const daysLeft = getDaysLeft(voucher.endAt);
                            const usagePercent = getUsagePercent(voucher);
                            const isUrgent = daysLeft <= 3 && daysLeft > 0;
                            const isAlmostGone = usagePercent >= 80;

                            return (
                                <div
                                    key={voucher._id}
                                    onClick={() => navigate(`/vouchers/${voucher._id}`)}
                                    className="group bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex cursor-pointer"
                                >
                                    {/* ── Left: Discount Badge ── */}
                                    <div className={`relative w-[130px] sm:w-[140px] shrink-0 bg-gradient-to-br ${theme.gradient} flex flex-col items-center justify-center text-white overflow-hidden`}>
                                        {/* Background pattern */}
                                        <div className="absolute inset-0 opacity-10">
                                            <div className="absolute -right-4 -top-4 w-24 h-24 border-[3px] border-white rounded-full" />
                                            <div className="absolute -left-6 -bottom-6 w-32 h-32 border-[3px] border-white rounded-full" />
                                        </div>

                                        <div className="relative z-10 text-center">
                                            <div className="text-3xl sm:text-4xl font-black tracking-tight leading-none drop-shadow-sm">
                                                {formatDiscount(voucher)}
                                            </div>
                                            <div className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1.5 opacity-80">
                                                {voucher.discountType === "percentage" ? "Giảm" : "Giảm"}
                                            </div>
                                        </div>

                                        {/* Category icon */}
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                            <IconComp className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    </div>

                                    {/* ── Perforation Edge ── */}
                                    <div className="relative w-0 shrink-0">
                                        {/* Top cutout */}
                                        <div className="absolute -top-3 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-full z-10" />
                                        {/* Bottom cutout */}
                                        <div className="absolute -bottom-3 -translate-x-1/2 w-6 h-6 bg-gradient-to-b from-slate-50 to-slate-100/80 rounded-full z-10" />
                                        {/* Dashed line */}
                                        <div className="absolute top-3 bottom-3 left-0 -translate-x-[0.5px] border-l-[1.5px] border-dashed border-slate-200" />
                                    </div>

                                    {/* ── Right: Info ── */}
                                    <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col justify-between">
                                        <div>
                                            {/* Title + Category badge */}
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <h3 className="font-bold text-slate-900 text-[15px] leading-snug truncate group-hover:text-orange-600 transition-colors">
                                                    {voucher.title}
                                                </h3>
                                                <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${theme.badgeBg} ${theme.text}`}>
                                                    {theme.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 line-clamp-1 mb-3 font-medium">
                                                {voucher.description}
                                            </p>

                                            {/* Meta row */}
                                            <div className="flex items-center gap-3 text-[11px] font-semibold mb-3">
                                                <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${isUrgent ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <Clock className="w-3 h-3" />
                                                    {isUrgent
                                                        ? `Còn ${daysLeft} ngày`
                                                        : `HSD: ${formatDate(voucher.endAt)}`}
                                                </span>
                                                {voucher.minOrderValue > 0 && (
                                                    <span className="text-slate-400">
                                                        Tối thiểu {(voucher.minOrderValue / 1000).toFixed(0)}K
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom: Code + Progress */}
                                        <div className="space-y-2.5">
                                            {/* Usage progress */}
                                            {voucher.usageLimit && (
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            Đã dùng {voucher.usedCount}/{voucher.usageLimit}
                                                        </span>
                                                        {isAlmostGone && (
                                                            <span className="text-[10px] font-bold text-red-500 animate-pulse">
                                                                Sắp hết!
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${isAlmostGone
                                                                ? 'bg-gradient-to-r from-red-400 to-red-500'
                                                                : `bg-gradient-to-r ${theme.gradient}`
                                                                }`}
                                                            style={{ width: `${usagePercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Code + CTA */}
                                            <div className="flex items-center gap-2">
                                                <div
                                                    onClick={(e) => handleCopy(e, voucher.code)}
                                                    className="flex-1 bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2 flex justify-between items-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-colors group/code"
                                                    title="Bấm để copy mã"
                                                >
                                                    <span className="font-mono font-bold text-slate-700 tracking-wider text-xs">
                                                        {voucher.code}
                                                    </span>
                                                    {copiedCode === voucher.code ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/code:text-orange-600 transition-colors" />
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/vouchers/${voucher._id}`);
                                                    }}
                                                    className="shrink-0 h-9 px-4 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1"
                                                >
                                                    Chi tiết
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── EMPTY STATE ── */}
                {!loading && !error && filteredVouchers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Ticket className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Không tìm thấy voucher nào</h3>
                        <p className="text-sm text-slate-500 mt-1 max-w-sm">
                            {searchQuery
                                ? `Không có kết quả nào phù hợp với "${searchQuery}"`
                                : "Hiện tại kho voucher đang trống, bạn quay lại sau nhé!"}
                        </p>
                        {searchQuery && (
                            <Button onClick={() => setSearchQuery("")} variant="outline" className="mt-4 rounded-xl">
                                Xóa tìm kiếm
                            </Button>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
};

export default VouchersPage;
