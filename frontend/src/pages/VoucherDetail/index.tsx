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
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import voucherAPI from "@/services/voucher.service";
import type { Voucher } from "@/types/voucher";
import { useTranslation } from "react-i18next";

const VoucherDetailPage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);
    const { id } = useParams<{ id: string }>();
    const [copied, setCopied] = useState(false);
    const [saved, setSaved] = useState(false);
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchVoucherDetail();
        }
    }, [id]);

    const fetchVoucherDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await voucherAPI.getVoucherById(id!);
            setVoucher(response.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Không thể tải thông tin voucher");
            console.error("Error fetching voucher:", err);
        } finally {
            setLoading(false);
        }
    };

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
        if (voucher.discount_type === "percentage") {
            return `${voucher.discount_value}%`;
        }
        return `${voucher.discount_value.toLocaleString()}đ`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
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
            `Sử dụng tối đa ${voucher.usage_limit_per_user} lần`,
            voucher.is_stackable ? "Có thể kết hợp với voucher khác" : "Không kết hợp với voucher khác",
        ]
        : [];

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
            </div>
        );
    }

    if (error || !voucher) {
        return (
            <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Có lỗi xảy ra</h2>
                    <p className="text-slate-600 mb-4">{error || "Không tìm thấy voucher"}</p>
                    <Button onClick={() => navigate("/vouchers")} className="bg-orange-600 hover:bg-orange-700">
                        Quay lại danh sách
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            {/* Header */}
            {/* Action Bar */}
            <div className="bg-white/80 backdrop-blur-xl border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-slate-600 hover:text-orange-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-semibold">{t('customer:voucherDetail.back')}</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <Share2 className="w-5 h-5 text-slate-600" />
                            </button>
                            <button
                                onClick={handleSave}
                                className={`p-2 hover:bg-gray-100 rounded-full transition-colors ${saved ? "text-orange-600" : "text-slate-600"
                                    }`}
                            >
                                <Bookmark className={`w-5 h-5 ${saved ? "fill-orange-600" : ""}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-8">
                {/* Voucher Card */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-3xl overflow-hidden shadow-xl mb-8">
                    {/* Hero Section */}
                    <div className="relative p-8 md:p-12">
                        <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md border border-white/30 text-orange-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
                            <Tag className="w-3 h-3" />
                            {voucher.category === "discount" && "Voucher giảm giá"}
                            {voucher.category === "freeship" && "Voucher freeship"}
                            {voucher.category === "newuser" && "Voucher người mới"}
                            {voucher.category === "special" && "Voucher đặc biệt"}
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">{voucher.title}</h1>
                        <p className="text-slate-600">{voucher.description}</p>
                    </div>

                    {/* Voucher Info */}
                    <div className="p-6 md:p-8">
                        {/* Code Section */}
                        <div className="bg-white/60 backdrop-blur rounded-2xl p-6 mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-slate-600 mb-1">{t('customer:voucherDetail.voucherCode')}</p>
                                    <p className="text-2xl font-black font-mono text-orange-600">{voucher.code}</p>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-4 h-4" />
                                            {t('customer:voucherDetail.copied')}
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            {t('customer:voucherDetail.copy')}
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">{t('customer:voucherDetail.discountValue')}</p>
                                    <p className="text-lg font-black text-slate-900">{formatDiscount()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">{t('customer:voucherDetail.minOrder')}</p>
                                    <p className="text-lg font-black text-slate-900">
                                        {voucher.min_order_amount.toLocaleString()}đ
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">{t('customer:voucherDetail.expires')}</p>
                                    <p className="text-sm font-bold text-red-600 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(voucher.end_date)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">{t('customer:voucherDetail.used')}</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {voucher.current_usage_count}
                                        {voucher.total_usage_limit && `/${voucher.total_usage_limit}`} lần
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <Button className="w-full h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-500/30">
                            {t('customer:voucherDetail.useNow')}
                        </Button>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{t('customer:voucherDetail.benefits')}</h2>
                    </div>
                    <div className="space-y-3">
                        {benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                </div>
                                <p className="text-slate-700 leading-relaxed">{benefit}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How to Use */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Info className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{t('customer:voucherDetail.howToUse')}</h2>
                    </div>
                    <div className="space-y-4">
                        {instructions.map((instruction, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                                    <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                                </div>
                                <p className="text-slate-700 leading-relaxed pt-1">{instruction}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Terms & Conditions */}
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{t('customer:voucherDetail.terms')}</h2>
                    </div>
                    <div className="space-y-3">
                        {voucher.conditions.map((term, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full shrink-0 mt-2" />
                                <p className="text-slate-600 text-sm leading-relaxed">{term}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-8 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl p-6 text-center">
                    <p className="text-white/90 text-sm mb-3">Đừng bỏ lỡ cơ hội tiết kiệm!</p>
                    <Button className="bg-white text-orange-600 hover:bg-gray-100 font-bold h-12 px-8 rounded-xl">
                        {t('customer:voucherDetail.applyNow')}
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default VoucherDetailPage;
