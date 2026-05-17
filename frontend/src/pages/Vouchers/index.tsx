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
    Wallet,
    History,
    Search,
    Clock,
    Zap,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import voucherAPI from "@/services/voucher.service";
import type { Voucher, VoucherCategory } from "@/types/voucher";
import { useTranslation } from "react-i18next";

const VouchersPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState(""); // State cho ô tìm kiếm
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const categories = [
        { id: "all", name: "Tất cả" },
        { id: "discount", name: "Giảm giá" },
        { id: "freeship", name: "Freeship" },
        { id: "newuser", name: "Người mới" },
        { id: "special", name: "Đặc biệt" },
    ];

    useEffect(() => {
        fetchVouchers();
    }, [activeCategory]);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            setError(null);

            const params: any = {
                is_active: true,
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

    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    const getTheme = (category: string) => {
        const themes: Record<string, string> = {
            discount: "text-orange-600 bg-orange-50 border-orange-200",
            freeship: "text-blue-600 bg-blue-50 border-blue-200",
            newuser: "text-purple-600 bg-purple-50 border-purple-200",
            special: "text-rose-600 bg-rose-50 border-rose-200",
        };
        return themes[category] || themes.discount;
    };

    const formatDiscount = (voucher: Voucher) => {
        if (voucher.discount_type === "percentage") {
            return `${voucher.discount_value}%`;
        }
        return `${(voucher.discount_value / 1000).toFixed(0)}K`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    // [CẬP NHẬT]: Logic lọc dữ liệu nội bộ dựa theo thanh tìm kiếm
    const filteredVouchers = useMemo(() => {
        if (!searchQuery.trim()) return vouchers;
        const lowerQuery = searchQuery.toLowerCase();
        return vouchers.filter(v =>
            v.code.toLowerCase().includes(lowerQuery) ||
            v.title.toLowerCase().includes(lowerQuery)
        );
    }, [vouchers, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* --- HEADER --- */}
            <div className="bg-white sticky top-0 z-50 border-b border-slate-100 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">{t('customer:voucher.title', 'Kho Voucher')}</h1>
                                <p className="text-xs text-slate-500 font-medium">
                                    {loading ? "Đang tải dữ liệu..." : `Hiện có ${vouchers.length} voucher khả dụng`}
                                </p>
                            </div>
                        </div>
                        <button className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-orange-600 bg-slate-50 border border-slate-200 hover:border-orange-200 hover:bg-orange-50 px-3 py-2 rounded-xl transition-all active:scale-95">
                            <History className="w-4 h-4" />
                            <span className="hidden sm:inline">Lịch sử</span>
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
                {/* --- WALLET SUMMARY --- */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-slate-400 text-sm font-medium mb-1">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span>Tiết kiệm tháng này</span>
                            </div>
                            <div className="text-4xl font-black tracking-tight mt-1">450.000đ</div>
                            <div className="mt-5 flex gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider bg-white/10 border border-white/20 px-2.5 py-1.5 rounded-lg">2 mã đã dùng</span>
                                <span className="text-[11px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1.5 rounded-lg">3 mã sắp hết hạn</span>
                            </div>
                        </div>
                        <div className="absolute right-[-40px] top-[-40px] w-48 h-48 bg-emerald-500 rounded-full blur-[80px] opacity-20"></div>
                    </div>

                    {/* Featured/Hero Voucher */}
                    <div className="relative bg-gradient-to-br from-orange-500 to-rose-500 p-6 rounded-3xl shadow-lg shadow-orange-500/20 text-white flex justify-between items-center overflow-hidden">
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-1.5 bg-black/20 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-3">
                                <Zap className="w-3.5 h-3.5 fill-current text-yellow-300" /> Flash Sale
                            </div>
                            <h3 className="text-2xl sm:text-3xl font-black mb-1 leading-tight drop-shadow-md">Giảm 50%<br />Toàn menu</h3>
                            <p className="text-xs font-medium text-orange-100 mb-4 opacity-90 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Kết thúc sau 2 giờ
                            </p>
                            <button className="bg-white text-orange-600 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-orange-50 active:scale-95 transition-all">
                                Lưu ngay
                            </button>
                        </div>
                        <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 text-center min-w-[80px] rotate-3 shadow-xl">
                            <span className="block text-3xl font-black drop-shadow-md">50%</span>
                            <span className="text-[11px] uppercase font-black tracking-widest opacity-90">Off</span>
                        </div>
                        <Sparkles className="absolute bottom-4 right-20 text-white/30 w-16 h-16 animate-pulse" />
                    </div>
                </section>

                {/* --- FILTERS & SEARCH --- */}
                <section className="flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-[73px] z-40 py-3 bg-slate-50/95 backdrop-blur-md">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0 mask-fade-edges">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${activeCategory === cat.id
                                    ? "bg-slate-900 text-white shadow-md"
                                    : "bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-800 hover:bg-slate-100/50"
                                    }`}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-72 shrink-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nhập mã voucher để tìm..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:font-normal"
                        />
                    </div>
                </section>

                {/* Loading State (Dùng Skeleton thay vì Spinner) */}
                {loading && (
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-between items-center">
                                    <div className="h-8 bg-slate-200 rounded w-1/3"></div>
                                    <div className="h-10 bg-slate-200 rounded-lg w-24"></div>
                                </div>
                            </div>
                        ))}
                    </section>
                )}

                {/* Error State */}
                {error && !loading && (
                    <div className="text-center py-20 bg-white rounded-3xl border border-red-100">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Ticket className="w-10 h-10 text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Không thể tải dữ liệu</h3>
                        <p className="text-slate-500 mb-6 text-sm">{error}</p>
                        <Button onClick={fetchVouchers} className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8">
                            Thử lại ngay
                        </Button>
                    </div>
                )}

                {/* --- VOUCHER LIST --- */}
                {!loading && !error && (
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredVouchers.map((voucher) => {
                            const theme = getTheme(voucher.category);
                            return (
                                <div
                                    key={voucher._id}
                                    onClick={() => navigate(`/vouchers/${voucher._id}`)}
                                    className="group bg-white rounded-[20px] border border-slate-200 shadow-sm hover:shadow-xl hover:border-orange-200 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
                                >
                                    {/* Upper Part */}
                                    <div className="p-5 flex gap-4 items-start relative">
                                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${theme.split(' ')[1].replace('text', 'bg').replace('50', '500')}`}></div>

                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${theme}`}>
                                            {voucher.category === 'freeship' ? <Truck className="w-6 h-6" /> :
                                                voucher.category === 'newuser' ? <Sparkles className="w-6 h-6" /> :
                                                    voucher.category === 'special' ? <Gift className="w-6 h-6" /> :
                                                        <Percent className="w-6 h-6" />}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-slate-900 text-lg leading-tight truncate pr-2 group-hover:text-orange-600 transition-colors">{voucher.title}</h3>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 mb-3 line-clamp-1 font-medium">{voucher.description}</p>

                                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                                                <span className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-md">
                                                    <Clock className="w-3 h-3" /> HSD: {formatDate(voucher.end_date)}
                                                </span>
                                                <span className="font-black text-orange-600 text-sm">
                                                    {formatDiscount(voucher)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Divider Line (Khoét lỗ khớp với màu nền bg-slate-50 của trang) */}
                                    <div className="relative h-px bg-slate-200 mx-5 border-t border-dashed border-slate-200">
                                        <div className="absolute -left-7 -top-2.5 w-5 h-5 bg-slate-50 rounded-full border-r border-slate-200 z-10"></div>
                                        <div className="absolute -right-7 -top-2.5 w-5 h-5 bg-slate-50 rounded-full border-l border-slate-200 z-10"></div>
                                    </div>

                                    {/* Bottom Part */}
                                    <div className="p-4 pt-5 bg-white flex items-center justify-between gap-3">
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopy(voucher.code);
                                            }}
                                            className="flex-1 bg-slate-50 border border-slate-200 border-dashed rounded-xl px-3 py-2 flex justify-between items-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-colors group/code"
                                            title="Bấm để copy mã"
                                        >
                                            <span className="font-mono font-bold text-slate-700 tracking-wider text-sm">{voucher.code}</span>
                                            {copiedCode === voucher.code ? (
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-4 h-4 text-slate-400 group-hover/code:text-orange-600 transition-colors" />
                                            )}
                                        </div>

                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/vouchers/${voucher._id}`);
                                            }}
                                            className="h-10 px-5 rounded-xl text-xs font-bold shadow-sm transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/20 active:scale-95"
                                        >
                                            Chi tiết
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}

                {/* Empty State / No Search Results */}
                {!loading && !error && filteredVouchers.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-3xl border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                            <Ticket className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Không tìm thấy voucher nào</h3>
                        <p className="text-sm text-slate-500 mt-1">
                            {searchQuery ? `Không có kết quả nào phù hợp với "${searchQuery}"` : "Hiện tại kho voucher đang trống, bạn quay lại sau nhé!"}
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