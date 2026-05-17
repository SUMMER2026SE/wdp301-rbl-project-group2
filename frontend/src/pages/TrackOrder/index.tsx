import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OrderTimeline, type OrderStep } from "@/components/shared/OrderTimeline";
import orderService, { type Order } from "@/services/order.service";
import { format, addMinutes } from "date-fns";
import { Loader2, AlertCircle } from "lucide-react";

const TrackOrderPage = () => {
    const { t } = useTranslation(['customer', 'common']);
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId') || searchParams.get('id');

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const res = await orderService.getOrderById(orderId);
                setOrder(res.data);
            } catch (err: any) {
                console.error("Failed to fetch order for tracking:", err);
                setError(err.response?.data?.message || "Không tìm thấy đơn hàng");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const mapStatusToStep = (status: string): OrderStep => {
        switch (status) {
            case 'pending': return 'pending';
            case 'confirmed': return 'confirmed';
            case 'processing':
            case 'ready_for_delivery': return 'preparing';
            case 'shipping': return 'delivering';
            case 'completed': return 'completed';
            default: return 'pending';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark">
                <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                <p className="text-[#9e6b47] dark:text-white/60 font-bold">Đang tải thông tin đơn hàng...</p>
            </div>
        );
    }

    if (!orderId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark px-6 text-center">
                <div className="size-20 bg-orange-600/5 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-orange-600 text-4xl">search</span>
                </div>
                <h2 className="text-2xl font-bold mb-2">Theo dõi đơn hàng</h2>
                <p className="text-slate-500 mb-8 max-w-sm">Vui lòng cung cấp mã đơn hàng để theo dõi tiến trình giao hàng.</p>
                <Link to="/" className="px-8 py-3 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all">
                    Quay lại trang chủ
                </Link>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-background-light dark:bg-background-dark px-6 text-center">
                <div className="size-20 bg-red-50 dark:bg-red-900/10 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{error || "Không tìm thấy đơn hàng"}</h2>
                <p className="text-slate-500 mb-8 max-w-sm">Mã đơn hàng không hợp lệ hoặc bạn không có quyền xem đơn hàng này.</p>
                <Link to="/menu" className="px-8 py-3 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-700 transition-all">
                    Tiếp tục mua sắm
                </Link>
            </div>
        );
    }

    // Determine headline text based on status
    const getHeadline = () => {
        switch (order.status) {
            case 'pending': return "Đơn hàng đã được ghi nhận";
            case 'confirmed': return "Nhà hàng đã xác nhận đơn";
            case 'processing': return "Đầu bếp đang chuẩn bị món";
            case 'ready_for_delivery': return "Món ăn đã sẵn sàng giao";
            case 'shipping': return "Shipper đang trên đường tới";
            case 'completed': return "Đã giao hàng thành công";
            case 'cancelled': return "Đơn hàng đã bị hủy";
            default: return "Đang cập nhật tiến trình";
        }
    };

    // Estimated delivery (dummy calculation: createdAt + 30 mins)
    const estimatedTime = format(addMinutes(new Date(order.createdAt), 30), "HH:mm");

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#1c130d] dark:text-white transition-colors duration-300 min-h-screen font-display">

            <main className="flex-1 max-w-[1200px] mx-auto w-full py-12 px-6">
                <section className="flex flex-col items-center text-center mb-16">
                    <div className="relative mb-6">
                        <div className="size-32 bg-orange-600/5 dark:bg-orange-600/10 rounded-full flex items-center justify-center">
                            {order.status === 'completed' ? (
                                <span className="material-symbols-outlined text-green-500 text-6xl">check_circle</span>
                            ) : order.status === 'cancelled' ? (
                                <span className="material-symbols-outlined text-red-500 text-6xl">cancel</span>
                            ) : (
                                <span className="material-symbols-outlined text-orange-600 text-6xl animate-bounce">
                                    {order.status === 'shipping' ? 'delivery_dining' : 'cooking'}
                                </span>
                            )}
                        </div>
                        {order.status === 'completed' && (
                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white size-10 rounded-full flex items-center justify-center ring-4 ring-background-light dark:ring-background-dark">
                                <span className="material-symbols-outlined text-[20px]">check</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-[#1c130d] dark:text-white mb-3">{getHeadline()}</h1>
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <p className="text-[#9e6b47] dark:text-white/60 text-lg">Dự kiến giao hàng: <span className="font-bold text-[#1c130d] dark:text-white">{estimatedTime}</span> (khoảng 30 phút)</p>
                    )}
                    {order.status === 'completed' && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi!</p>
                    )}
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* Progress Timeline */}
                        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-sm border border-[#f4ece6] dark:border-white/10">
                            {order.status === 'cancelled' ? (
                                <div className="flex flex-col items-center py-6">
                                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error_outline</span>
                                    <p className="text-xl font-bold text-red-600">Đơn hàng đã bị hủy</p>
                                    <p className="text-slate-500 text-sm mt-2">Chúng tôi rất tiếc về sự bất tiện này.</p>
                                </div>
                            ) : (
                                <OrderTimeline currentStep={mapStatusToStep(order.status)} />
                            )}
                        </div>

                        {/* Order Details Banner */}
                        <div className="bg-orange-600 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined">receipt_long</span>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium">Mã đơn hàng</p>
                                    <h4 className="text-xl font-extrabold">#{order.code}</h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white">credit_card</span>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium">Thanh toán</p>
                                    <h4 className="text-xl font-extrabold">
                                        {order.payment.method === 'cash_on_delivery' ? 'COD' : 'Chuyển khoản'}
                                    </h4>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="size-12 bg-white/20 rounded-full flex items-center justify-center">
                                    <span className="material-symbols-outlined">event</span>
                                </div>
                                <div>
                                    <p className="text-white/70 text-sm font-medium">Ngày đặt</p>
                                    <h4 className="text-xl font-extrabold">{format(new Date(order.createdAt), "dd/MM/yyyy")}</h4>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Status (Optional but nice) */}
                        <div className="p-8 bg-white dark:bg-white/5 rounded-3xl border border-[#f4ece6] dark:border-white/10">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <span className="material-symbols-outlined text-orange-600">room_service</span>
                                Trạng thái chi tiết
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-orange-600 mt-0.5">location_on</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Địa chỉ giao hàng</p>
                                        <p className="text-sm font-bold">{order.delivery_address.receiver_name} • {order.delivery_address.phone}</p>
                                        <p className="text-sm text-slate-500 leading-snug">{order.delivery_address.detail}, {order.delivery_address.ward}, {order.delivery_address.district}, {order.delivery_address.city}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-orange-600 mt-0.5">info</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Ghi chú</p>
                                        <p className="text-sm italic text-slate-600">"{order.note || 'Không có ghi chú'}"</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-sm border border-[#f4ece6] dark:border-white/10 sticky top-28">
                            <h3 className="text-lg font-bold mb-6">{t('customer:cart.grandTotal', 'Tóm tắt đơn hàng')}</h3>
                            <div className="space-y-4 mb-6">
                                {order.items.map((item, idx) => {
                                    const product = typeof item.product_id === 'object' ? item.product_id : null;
                                    return (
                                        <div key={idx} className="flex justify-between items-start gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-[#1c130d] dark:text-white">{item.quantity}x {product?.name || "Sản phẩm"}</span>
                                                {item.variations?.length > 0 && (
                                                    <span className="text-xs text-[#9e6b47]">
                                                        {item.variations.map(v => v.choice).join(", ")}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-sm font-bold">{item.sub_total.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    );
                                })}
                                <div className="pt-4 border-t border-[#f4ece6] dark:border-white/10 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#9e6b47]">{t('customer:cart.subtotal')}</span>
                                        <span className="font-medium">{order.sub_total.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#9e6b47]">{t('customer:cart.deliveryFee')}</span>
                                        <span className="font-medium">{order.shipping_fee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-extrabold pt-2">
                                        <span>{t('customer:cart.grandTotal')}</span>
                                        <span className="text-orange-600">{order.total_price.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Link to={`/orders/${order._id}`} className="w-full py-4 bg-orange-600 text-white font-bold rounded-full hover:bg-orange-600/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                                    <span className="material-symbols-outlined text-[20px]">receipt</span>
                                    Xem chi tiết đơn hàng
                                </Link>
                                <Link to="/" className="w-full py-4 bg-[#f4ece6] dark:bg-white/10 text-[#1c130d] dark:text-white font-bold rounded-full hover:bg-[#e9d9ce] dark:hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[20px]">home</span>
                                    {t('customer:orderSuccess.backToHome')}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TrackOrderPage;
