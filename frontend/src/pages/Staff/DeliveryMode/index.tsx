import { useState, useEffect, useCallback } from "react";
import { Loader2, Phone, CheckCircle, Wallet, Clock, RotateCcw, Map, MapPin } from "lucide-react";
import orderService, { type Order } from "@/services/order.service";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";

const PAYMENT_LABEL: Record<string, string> = {
    cash_on_delivery: "Tiền mặt (COD)",
    vnpay: "Đã thanh toán (VNPay)",
    momo: "Đã thanh toán (Momo)",
    credit_card: "Đã thanh toán (Thẻ)",
    paypal: "Đã thanh toán (PayPal)",
};

export default function StaffDeliveryMode() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchDeliveries = useCallback(async (showLoader = false) => {
        if (!user?._id) return;
        if (showLoader) setLoading(true);
        try {
            const res = await orderService.getAllOrders({
                status: "shipping",
                driver_id: user._id,
            });
            setOrders(res.data);
        } catch (error) {
            console.error("Failed to fetch deliveries", error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [user?._id]);

    useEffect(() => {
        fetchDeliveries(true);
    }, [fetchDeliveries]);

    const handleCompleteDelivery = async (orderId: string) => {
        if (actioningIds.has(orderId)) return;
        setActioningIds((prev) => new Set(prev).add(orderId));
        try {
            await orderService.completeDelivery(orderId);
            toast("Đã giao hàng thành công! 🎉", "success");
            await fetchDeliveries();
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data
                    ?.message ?? "Không thể hoàn thành đơn hàng.";
            toast(msg, "error");
        } finally {
            setActioningIds((prev) => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    // SỬA LẠI LINK GOOGLE MAPS CHUẨN
    const openMap = (address: string) => {
        const query = encodeURIComponent(address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3 min-h-[60vh]">
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
                <p className="text-gray-500 font-bold">Đang tải đơn hàng...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto pb-10 px-4 sm:px-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#f8f7f6] pt-4 pb-4 z-10 border-b border-gray-200">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        Đơn đang giao
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        Tổng: <strong className="text-orange-500">{orders.length}</strong> đơn hàng
                    </p>
                </div>
                <button
                    onClick={() => fetchDeliveries(true)}
                    className="p-3 rounded-2xl bg-white shadow-sm border border-gray-200 hover:bg-orange-50 active:scale-95 transition-all text-slate-600 hover:text-orange-500"
                >
                    <RotateCcw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white rounded-[2rem] border border-slate-200 shadow-sm">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-5 border border-slate-100">
                        <CheckCircle className="w-10 h-10 text-slate-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">
                        Bạn hiện không có đơn nào
                    </h2>
                    <p className="text-gray-500 font-medium">
                        Hãy đợi Bếp phân công đơn hàng mới nhé!
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {orders.map((order) => {
                        const isActioning = actioningIds.has(order._id);
                        const address = order.delivery_address;
                        const fullAddress = `${address?.detail || ""}, ${address?.ward || ""}, ${address?.district || ""}`;
                        const isCOD = order.payment.method === "cash_on_delivery";

                        return (
                            <div
                                key={order._id}
                                className="bg-white rounded-[2rem] p-5 sm:p-6 shadow-sm border border-slate-200"
                            >
                                {/* Order Top Info */}
                                <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-600 font-black text-lg">
                                            #{order.code.slice(-4)}
                                        </span>
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                                Mã Đơn Hàng
                                            </h3>
                                            <div className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(order.updatedAt).toLocaleTimeString("vi-VN", {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* THÔNG TIN GIAO HÀNG (Làm siêu to để dễ bấm) */}
                                <div className="bg-slate-50 rounded-2xl p-4 mb-5 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg shrink-0">
                                                {(address?.receiver_name || "K").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-lg">
                                                    {address?.receiver_name || (order.user_id as any)?.username || "Khách hàng"}
                                                </div>
                                                <div className="text-sm font-bold text-orange-600">
                                                    {address?.phone || (order.user_id as any)?.phone || "Không có SĐT"}
                                                </div>
                                            </div>
                                        </div>
                                        {/* Nút Call cực to */}
                                        <a
                                            href={`tel:${address?.phone || (order.user_id as any)?.phone}`}
                                            className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 hover:bg-emerald-200 active:scale-95 transition-all shadow-sm"
                                        >
                                            <Phone className="w-5 h-5 fill-current" />
                                        </a>
                                    </div>

                                    {/* Nút chỉ đường cực to */}
                                    <button
                                        onClick={() => openMap(fullAddress)}
                                        className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-all group active:scale-[0.98]"
                                    >
                                        <div className="flex items-start gap-3 text-left">
                                            <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Địa chỉ nhận</p>
                                                <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2">
                                                    {fullAddress}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <Map className="w-4 h-4" />
                                        </div>
                                    </button>
                                </div>

                                {/* Chi tiết món ăn */}
                                <div className="mb-5 px-2">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Đơn hàng gồm:</div>
                                    <div className="text-sm font-medium text-slate-700 leading-relaxed">
                                        {order.items.map((item, idx) => {
                                            const prod = item.product_id as any;
                                            return <span key={idx} className="mr-2 inline-block">• {item.quantity}x {prod?.name || 'Sản phẩm'}</span>;
                                        })}
                                    </div>
                                </div>

                                {/* Payment Section (Crucial) */}
                                <div className={`p-5 rounded-2xl mb-6 flex items-center justify-between border-2 ${isCOD ? 'bg-orange-50 border-orange-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <Wallet className={`w-6 h-6 ${isCOD ? 'text-orange-500' : 'text-emerald-500'}`} />
                                        <div>
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                                                {PAYMENT_LABEL[order.payment.method] || order.payment.method}
                                            </div>
                                            <div className={`font-black text-2xl tracking-tight ${isCOD ? 'text-orange-600' : 'text-emerald-600'}`}>
                                                {order.total_price.toLocaleString("vi-VN")}đ
                                            </div>
                                        </div>
                                    </div>
                                    {isCOD && (
                                        <span className="px-3 py-1.5 bg-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm">
                                            THU TIỀN
                                        </span>
                                    )}
                                </div>

                                {/* MAIN ACTION */}
                                <button
                                    onClick={() => handleCompleteDelivery(order._id)}
                                    disabled={isActioning}
                                    className={`w-full py-4 rounded-xl text-white font-black text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${isCOD ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
                                >
                                    {isActioning ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            ĐANG XỬ LÝ...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-6 h-6" />
                                            {isCOD ? "GIAO XONG & ĐÃ THU TIỀN" : "XÁC NHẬN ĐÃ GIAO"}
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}