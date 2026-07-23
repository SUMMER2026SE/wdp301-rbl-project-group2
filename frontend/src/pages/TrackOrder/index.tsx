import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OrderTimeline, type OrderStep } from "@/components/shared/OrderTimeline";
import orderService, { type Order } from "@/services/order.service";
import { format, addMinutes } from "date-fns";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { getSupportSocket } from "@/lib/support-socket";

const TrackOrderPage = () => {
    const { t } = useTranslation(['customer', 'common']);
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId') || searchParams.get('id');

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { user } = useAuth();
    const [submitting, setSubmitting] = useState(false);

    const handleConfirmReceipt = async () => {
        if (!orderId) return;
        try {
            setSubmitting(true);
            const res = await orderService.confirmReceipt(orderId);
            if (res.success) {
                setOrder(res.data);
                toast.success("Xác nhận đã nhận hàng thành công!");
            }
        } catch (err) {
            const errorVal = err as Error & { response?: { data?: { message?: string } } };
            console.error("Failed to confirm receipt:", errorVal);
            toast.error(errorVal.response?.data?.message || "Không thể xác nhận nhận hàng");
        } finally {
            setSubmitting(false);
        }
    };

    const orderOwnerId = order && (typeof order.cusId === 'string' ? order.cusId : order.cusId?._id);
    const isOwner = !!(user && orderOwnerId && user._id === orderOwnerId);

    const fetchOrder = async (showLoading = true) => {
        if (!orderId) {
            setLoading(false);
            return;
        }

        try {
            if (showLoading) setLoading(true);
            const res = await orderService.getOrderById(orderId);
            setOrder(res.data);
        } catch (err) {
            const errorVal = err as Error & { response?: { data?: { message?: string } } };
            console.error("Failed to fetch order for tracking:", errorVal);
            if (showLoading) {
                setError(errorVal.response?.data?.message || "Không tìm thấy đơn hàng");
            }
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder(true);
    }, [orderId]);

    useEffect(() => {
        const socket = getSupportSocket();

        const handleStatusUpdated = (data: { orderId: string }) => {
            if (data.orderId === orderId) {
                fetchOrder(false);
            }
        };

        socket.on("order:status_updated", handleStatusUpdated);

        return () => {
            socket.off("order:status_updated", handleStatusUpdated);
        };
    }, [orderId]);

    const mapStatusToStep = (status: string): OrderStep => {
        switch (status) {
            case 'pending': return 'pending';
            case 'confirmed': return 'confirmed';
            case 'processing':
            case 'ready_for_delivery': return 'preparing';
            case 'shipping':
            case 'delivering': return 'delivering';
            case 'delivered': return 'delivered';
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
            case 'shipping': return "Shipper đang trên đường giao hàng";
            case 'delivered': return "Đã giao đến nơi (Vui lòng xác nhận)";
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
                            ) : order.status === 'delivered' ? (
                                <span className="material-symbols-outlined text-orange-500 text-6xl animate-pulse">home</span>
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
                        {order.status === 'delivered' && (
                            <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white size-10 rounded-full flex items-center justify-center ring-4 ring-background-light dark:ring-background-dark animate-bounce">
                                <span className="material-symbols-outlined text-[20px]">notifications_active</span>
                            </div>
                        )}
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold text-[#1c130d] dark:text-white mb-3">{getHeadline()}</h1>
                    {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <p className="text-[#9e6b47] dark:text-white/60 text-lg">Dự kiến giao hàng: <span className="font-bold text-[#1c130d] dark:text-white">{estimatedTime}</span> (khoảng 30 phút)</p>
                    )}
                    {order.status === 'delivered' && (
                        <p className="text-orange-600 dark:text-orange-400 font-bold text-lg animate-pulse">Vui lòng kiểm tra và xác nhận nhận hàng</p>
                    )}
                    {order.status === 'completed' && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">Cảm ơn bạn đã tin tưởng dịch vụ của chúng tôi!</p>
                    )}
                </section>

                {order.status === 'delivered' && isOwner && (
                    <div className="max-w-[800px] mx-auto w-full mb-10 p-6 bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
                        <div className="flex items-start gap-4 text-left">
                            <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#ea580c] shrink-0">
                                <span className="material-symbols-outlined text-[28px] animate-bounce">moped</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-lg">Đơn hàng đã được giao tới bạn!</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Vui lòng kiểm tra món ăn và nhấn xác nhận. Đơn hàng sẽ tự động hoàn thành sau 30 phút.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleConfirmReceipt}
                            disabled={submitting}
                            className="px-6 py-3 bg-[#ea580c] text-white font-bold text-sm rounded-xl hover:bg-orange-700 active:scale-[0.98] shadow-lg shadow-orange-600/20 hover:shadow-orange-600/30 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Xác nhận đã nhận hàng
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-10">
                        {/* Progress Timeline */}
                        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl shadow-sm border border-[#f4ece6] dark:border-white/10">
                            {order.status === 'cancelled' ? (
                                <div className="flex flex-col items-center py-6 text-center">
                                    <span className="material-symbols-outlined text-red-500 text-6xl mb-4">error_outline</span>
                                    <p className="text-xl font-bold text-red-600">Đơn hàng đã bị hủy</p>
                                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-2xl max-w-md w-full text-left">
                                        <p className="text-sm font-bold text-red-700 dark:text-red-300">
                                            Lý do hủy: <span className="font-normal text-slate-800 dark:text-slate-200">{order.cancellation?.reason || order.statusHistory?.find((h: any) => h.status === 'cancelled')?.reason || 'Không có lý do'}</span>
                                        </p>
                                        {order.cancellation?.cancelledBy && (
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-medium">
                                                Hủy bởi: {order.cancellation.cancelledBy === 'staff' ? 'Nhân viên cửa hàng' : 'Khách hàng'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <OrderTimeline currentStep={mapStatusToStep(order.status)} order={order} />
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
                                        {order.payment.method === 'cash' ? 'COD' : 'Chuyển khoản'}
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
                                        <p className="text-sm font-bold">{order.deliveryAddress.receiverName} • {order.deliveryAddress.phone}</p>
                                        <p className="text-sm text-slate-500 leading-snug">{order.deliveryAddress.detail}, {order.deliveryAddress.ward}, {order.deliveryAddress.city}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-blue-600 mt-0.5">store</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Chi nhánh giao hàng</p>
                                        <p className="text-sm font-bold">
                                            {typeof order.storeId === 'object' && order.storeId
                                                ? (order.storeId.name || order.storeId.storeName || 'Chi nhánh phục vụ')
                                                : 'Chi nhánh chính'}
                                        </p>
                                        {typeof order.storeId === 'object' && order.storeId?.address && (
                                            <p className="text-sm text-slate-500 leading-snug">{order.storeId.address}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-emerald-600 mt-0.5">moped</span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Nhân viên giao hàng</p>
                                        {(() => {
                                            if (order.status === 'cancelled') {
                                                return (
                                                    <p className="text-sm italic text-slate-400 font-medium">
                                                        — (Đơn hàng đã hủy)
                                                    </p>
                                                );
                                            }

                                            const driverName =
                                                order.deliveryInfo?.driverName ||
                                                (typeof order.deliveryInfo?.driverId === 'object'
                                                    ? order.deliveryInfo?.driverId?.fullName || order.deliveryInfo?.driverId?.username
                                                    : null);

                                            const driverPhone =
                                                order.deliveryInfo?.driverPhone ||
                                                (typeof order.deliveryInfo?.driverId === 'object'
                                                    ? order.deliveryInfo?.driverId?.phone
                                                    : null);

                                            if (driverName) {
                                                return (
                                                    <>
                                                        <p className="text-sm font-bold">{driverName}</p>
                                                        {driverPhone && <p className="text-sm text-slate-500">{driverPhone}</p>}
                                                    </>
                                                );
                                            }

                                            return (
                                                <p className="text-sm italic text-slate-500 font-medium">
                                                    {['shipping', 'delivering', 'delivered', 'completed'].includes(order.status)
                                                        ? 'Đang phân công giao hàng'
                                                        : 'Chưa phân công'}
                                                </p>
                                            );
                                        })()}
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
                                    const product = typeof item.productId === 'object' ? item.productId : null;
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
                                            <span className="text-sm font-bold">{item.subTotal.toLocaleString('vi-VN')}đ</span>
                                        </div>
                                    );
                                })}
                                <div className="pt-4 border-t border-[#f4ece6] dark:border-white/10 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#9e6b47]">{t('customer:cart.subtotal')}</span>
                                        <span className="font-medium">{order.subTotal.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-[#9e6b47]">{t('customer:cart.deliveryFee')}</span>
                                        <span className="font-medium">{order.shippingFee.toLocaleString('vi-VN')}đ</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-extrabold pt-2">
                                        <span>{t('customer:cart.grandTotal')}</span>
                                        <span className="text-orange-600">{order.totalPrice.toLocaleString('vi-VN')}đ</span>
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
