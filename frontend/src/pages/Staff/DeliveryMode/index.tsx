import { useState, useEffect, useCallback, useRef, useMemo, type MouseEvent } from "react";
import {
    Loader2,
    Phone,
    CheckCircle,
    Clock,
    MapPin,
    X,
    ChevronRight,
    Truck,
    Navigation,
    Package,
    RefreshCw,
} from "lucide-react";
import orderService, { type Order } from "@/services/order.service";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { getSupportSocket } from "@/lib/support-socket";

// ── Helpers ──────────────────────────────────────────────────────────────────
function isCodPayment(method: string | undefined): boolean {
    return method === "cash" || method === "cash_on_delivery";
}

function formatAddress(addr: Order["deliveryAddress"] | undefined): string {
    if (!addr) return "Không có địa chỉ";
    return [addr.detail, addr.ward, addr.district, addr.city].filter(Boolean).join(", ");
}

function getCustomerName(order: Order): string {
    if (order.deliveryAddress?.receiverName) return order.deliveryAddress.receiverName;
    if (order.cusId && typeof order.cusId === "object") return order.cusId.fullName || order.cusId.username;
    return "Khách hàng";
}

function getCustomerPhone(order: Order): string {
    if (order.deliveryAddress?.phone) return order.deliveryAddress.phone;
    if (order.cusId && typeof order.cusId === "object") return order.cusId.phone;
    return "";
}

function getProductName(item: Order["items"][number]): string {
    if (item.productId && typeof item.productId === "object") return item.productId.name;
    return "Sản phẩm";
}

function getProductPrice(item: Order["items"][number]): number {
    if (item.productId && typeof item.productId === "object") return item.productId.price;
    return 0;
}

function formatCurrency(val: number): string {
    return val.toLocaleString("vi-VN") + "đ";
}

function formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

// Link to Google Maps is now handled natively via <a> tags for better mobile/app compatibility

// ── Detail Drawer ────────────────────────────────────────────────────────────
interface DrawerProps {
    order: Order | null;
    open: boolean;
    onClose: () => void;
    onComplete: (orderId: string) => void;
    isActioning: boolean;
}

function DetailDrawer({ order, open, onClose, onComplete, isActioning }: DrawerProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    const handleOverlayClick = (e: MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    useEffect(() => {
        if (!open) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [open, onClose]);

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    if (!order) return null;

    const isCOD = isCodPayment(order.payment?.method);
    const fullAddress = formatAddress(order.deliveryAddress);
    const customerName = getCustomerName(order);
    const customerPhone = getCustomerPhone(order);

    return (
        <>
            {/* Overlay */}
            <div
                ref={overlayRef}
                onClick={handleOverlayClick}
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity duration-500 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
            />

            {/* Drawer Panel */}
            <div
                className={`fixed right-0 top-0 bottom-0 w-full max-w-[480px] bg-[#fdfcfb] shadow-2xl border-l border-slate-200 z-50 flex flex-col transition-transform duration-500 ease-out ${open ? "translate-x-0" : "translate-x-full"
                    }`}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold text-sm">
                            #{order.code.slice(-4)}
                        </span>
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Chi tiết đơn hàng</h2>
                            <p className="text-xs text-slate-400 mt-0.5 font-medium">Mã: {order.code}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-95"
                    >
                        <X className="w-4 h-4 text-slate-600" />
                    </button>
                </div>

                {/* Drawer Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Delivery Info */}
                    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-sm shrink-0">
                                    {customerName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{customerName}</div>
                                    <div className="text-xs font-semibold text-slate-500 mt-0.5">{customerPhone}</div>
                                </div>
                            </div>
                            {customerPhone && (
                                <a
                                    href={`tel:${customerPhone}`}
                                    className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                                >
                                    <Phone className="w-4 h-4 fill-current" />
                                </a>
                            )}
                        </div>

                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-between p-3 bg-blue-50/40 border border-blue-100 rounded-xl hover:bg-blue-50 transition-all text-left group"
                        >
                            <div className="flex items-start gap-2.5">
                                <MapPin className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                                <p className="text-xs font-medium text-slate-700 leading-normal line-clamp-2">
                                    {fullAddress}
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </section>

                    {/* Products */}
                    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
                            <Package className="w-4 h-4 text-slate-500" />
                            <h3 className="text-xs font-bold text-slate-700">Danh sách món ({order.items.length})</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {order.items.map((item, idx) => {
                                const name = getProductName(item);
                                const price = getProductPrice(item);
                                return (
                                    <div key={idx} className="p-4 flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-2.5">
                                            <span className="flex items-center justify-center bg-slate-100 text-slate-700 font-bold text-xs px-1.5 py-0.5 rounded min-w-[24px]">
                                                {item.quantity}x
                                            </span>
                                            <div>
                                                <div className="text-xs font-bold text-slate-900 leading-snug">{name}</div>
                                                {item.variations && item.variations.length > 0 && (
                                                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                                                        {item.variations.map((v) => `${v.name}: ${v.choice}`).join(" • ")}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                                            {price > 0 ? formatCurrency(price * item.quantity) : formatCurrency(item.subTotal)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Notes */}
                    {(order.note || (order.staffNoteItems && order.staffNoteItems.length > 0)) && (
                        <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                            {order.note && (
                                <div className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-xl p-3">
                                    <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Ghi chú từ khách</span>
                                    "{order.note}"
                                </div>
                            )}
                            {order.staffNoteItems && order.staffNoteItems.length > 0 && (
                                <div className="text-xs font-medium text-blue-800 bg-blue-50 border border-blue-100 rounded-xl p-3">
                                    <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Ghi chú nội bộ</span>
                                    {order.staffNoteItems.map((note, i) => (
                                        <div key={i} className="mt-0.5">• {note}</div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Bill Breakdown */}
                    <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>Tạm tính</span>
                            <span>{formatCurrency(order.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 font-medium">
                            <span>Phí giao hàng</span>
                            <span>{formatCurrency(order.shippingFee)}</span>
                        </div>
                        <div className="border-t border-dashed border-slate-200 pt-2.5 flex justify-between items-baseline">
                            <span className="text-sm font-bold text-slate-900">Tổng cộng cần thu</span>
                            <span className={`text-xl font-extrabold ${isCOD ? "text-orange-600" : "text-emerald-600"}`}>
                                {formatCurrency(order.totalPrice)}
                            </span>
                        </div>
                        <div className={`mt-1 px-3 py-2 rounded-xl text-center text-xs font-bold uppercase tracking-wider ${isCOD ? "bg-orange-50 border border-orange-100 text-orange-700" : "bg-emerald-50 border border-emerald-100 text-emerald-700"
                            }`}>
                            {isCOD ? "💵 Thu tiền mặt (COD)" : "✅ Khách đã thanh toán online"}
                        </div>
                    </section>
                </div>

                {/* Drawer Footer */}
                <div className="shrink-0 px-5 py-4 border-t border-slate-200 bg-white">
                    <button
                        onClick={() => onComplete(order._id)}
                        disabled={isActioning}
                        className={`w-full py-4 rounded-xl text-white font-bold text-sm uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 ${isCOD ? "bg-orange-600 hover:bg-orange-700 shadow-orange-600/10" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10"
                            }`}
                    >
                        {isActioning ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Đang cập nhật...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                {isCOD ? "Đã thu tiền & Giao xong" : "Xác nhận đã giao đơn"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StaffDeliveryMode() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningIds, setActioningIds] = useState<Set<string>>(new Set());
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    const [confirmModalData, setConfirmModalData] = useState<{
        isOpen: boolean;
        orderId: string | null;
        code: string;
        totalPrice: number;
        isCOD: boolean;
    }>({
        isOpen: false,
        orderId: null,
        code: "",
        totalPrice: 0,
        isCOD: false,
    });

    const triggerCompleteDelivery = (order: Order) => {
        setConfirmModalData({
            isOpen: true,
            orderId: order._id,
            code: order.code,
            totalPrice: order.totalPrice,
            isCOD: isCodPayment(order.payment?.method),
        });
    };

    // Sort orders: earlier orders (older) on top, later orders (newer) at the bottom
    const sortedOrders = useMemo(() => {
        return [...orders].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
    }, [orders]);

    const fetchDeliveries = useCallback(async (showLoader = false) => {
        if (!user?._id || !user.storeId) return;
        if (showLoader) setLoading(true);
        try {
            const res = await orderService.getStaffOrders({
                storeId: user.storeId,
                status: "shipping",
            });
            // Filter to only orders assigned to this driver
            const myDeliveries = (res.data ?? []).filter(
                (o) => o.deliveryInfo?.driverId === user._id
            );
            setOrders(myDeliveries);
        } catch (error) {
            console.error("Failed to fetch deliveries", error);
        } finally {
            if (showLoader) setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDeliveries(true);
        }, 0);
        return () => clearTimeout(timer);
    }, [fetchDeliveries]);

    useEffect(() => {
        const socket = getSupportSocket();

        const handleStatusUpdated = (data: { orderId: string; status: string }) => {
            console.log("[StaffDeliveryMode] Realtime order status update received:", data);
            // Refresh delivery list if we get an update
            void fetchDeliveries();
        };

        socket.on("order:status_updated", handleStatusUpdated);

        return () => {
            socket.off("order:status_updated", handleStatusUpdated);
        };
    }, [fetchDeliveries]);

    const handleCompleteDelivery = async (orderId: string) => {
        if (actioningIds.has(orderId) || !user?.storeId) return;
        setActioningIds((prev) => new Set(prev).add(orderId));
        try {
            await orderService.staffCompleteDelivery(orderId, { storeId: user.storeId });
            toast("Đã giao hàng thành công! 🎉", "success");
            setDrawerOpen(false);
            setSelectedOrder(null);
            setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
            await fetchDeliveries();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Không thể hoàn thành đơn hàng.";
            toast(msg, "error");
        } finally {
            setActioningIds((prev) => {
                const next = new Set(prev);
                next.delete(orderId);
                return next;
            });
        }
    };

    const openDrawer = (order: Order) => {
        setSelectedOrder(order);
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        setDrawerOpen(false);
        setTimeout(() => setSelectedOrder(null), 300);
    };

    const totalCOD = sortedOrders
        .filter((o) => isCodPayment(o.payment?.method))
        .reduce((sum, o) => sum + o.totalPrice, 0);

    const codOrderCount = sortedOrders.filter((o) => isCodPayment(o.payment?.method)).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] gap-3">
                <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100">
                    <Loader2 className="w-7 h-7 text-orange-600 animate-spin" />
                </div>
                <p className="text-xs text-slate-500 font-bold animate-pulse">Đang quét danh sách chuyến giao...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[640px] mx-auto pb-24 px-4 sm:px-0 animate-in fade-in duration-300">

            {/* Header đồng bộ với các trang Staff khác */}
            <div className="flex flex-col gap-5 mb-6 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/20">
                            <Truck className="w-6 h-6 text-orange-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                                Chuyến Giao Hàng
                            </h1>
                            <p className="text-sm font-medium text-slate-500 mt-0.5 flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                Trực tuyến
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchDeliveries(true)}
                        className="flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95 border border-transparent hover:border-orange-200"
                        title="Làm mới"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </button>
                </div>

                {/* Grid KPI thu nhỏ trực quan */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <div className="text-xl font-black text-slate-800">{sortedOrders.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Cần giao</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <div className="text-xl font-black text-slate-800">{codOrderCount}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Đơn COD</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                        <div className="text-xl font-black text-orange-600 truncate">{formatCurrency(totalCOD)}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Tiền COD</div>
                    </div>
                </div>
            </div>

            {/* ─── Order List ───────────────────────────────────────────── */}
            {sortedOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h2 className="text-sm font-bold text-slate-900 mb-1">Thảnh thơi rồi! Không có đơn cần giao</h2>
                    <p className="text-xs text-slate-400 max-w-xs font-medium">
                        Các đơn hàng khi chuẩn bị xong sẽ đồng bộ tức thì về đây.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedOrders.map((order) => {
                        const isActioning = actioningIds.has(order._id);
                        const isCOD = isCodPayment(order.payment?.method);
                        const customerName = getCustomerName(order);
                        const customerPhone = getCustomerPhone(order);
                        const fullAddress = formatAddress(order.deliveryAddress);
                        const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

                        return (
                            <div
                                key={order._id}
                                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all overflow-hidden p-5 flex flex-col gap-4"
                            >
                                {/* Hàng 1: Mã đơn & Giá trị tiền & Trạng thái thanh toán */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openDrawer(order)}
                                            className="inline-flex items-center gap-2 text-sm font-black text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-2xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 active:scale-95 transition-all shadow-sm group"
                                            title="Xem chi tiết đơn hàng"
                                        >
                                            <span>Đơn #{order.code.slice(-4)}</span>
                                            {/* <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-slate-500 group-hover:bg-orange-500 group-hover:text-white transition-all shadow-sm">
                                                Chi tiết
                                            </span> */}
                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${isCOD ? "bg-orange-50 text-orange-600 border border-orange-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                            }`}>
                                            {isCOD ? "COD" : "Đã thanh toán"}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-black ${isCOD ? "text-orange-600" : "text-emerald-600"}`}>
                                            {formatCurrency(order.totalPrice)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center justify-end gap-1">
                                            <Clock className="w-3 h-3" /> {formatTime(order.updatedAt)} • {itemCount} món
                                        </div>
                                    </div>
                                </div>

                                {/* Hàng 2: Chi tiết người nhận & địa chỉ & SĐT */}
                                <div className="space-y-3.5 text-left">
                                    <div className="flex flex-col gap-1 pl-9 relative">
                                        <div className="absolute left-0 top-0.5 w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs shrink-0">
                                            {customerName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="text-sm font-black text-slate-800">{customerName}</div>
                                        {customerPhone ? (
                                            <a
                                                href={`tel:${customerPhone}`}
                                                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 hover:text-emerald-700 w-fit active:scale-95 transition-all bg-emerald-50/50 border border-emerald-100/50 px-2 py-0.5 rounded-lg shadow-sm"
                                                title="Bấm để gọi"
                                            >
                                                <Phone className="w-3 h-3 fill-current text-emerald-500 animate-pulse" />
                                                {customerPhone}
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-bold">Không có SĐT</span>
                                        )}
                                    </div>

                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-start gap-2 text-slate-600 hover:text-blue-600 group transition-colors pl-9 relative"
                                    >
                                        <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5 absolute left-1.5" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                                                {fullAddress}
                                            </p>
                                            <span className="text-[10px] font-bold text-blue-500 inline-flex items-center gap-0.5 mt-0.5">
                                                Chạm để chỉ đường qua Google Maps <Navigation className="w-2.5 h-2.5 shrink-0" />
                                            </span>
                                        </div>
                                    </a>
                                </div>

                                {/* CTA Giao Hàng Chính */}
                                <button
                                    onClick={() => triggerCompleteDelivery(order)}
                                    disabled={isActioning}
                                    className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-md ${isCOD
                                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-emerald-500/20"
                                        }`}
                                >
                                    {isActioning ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4" />
                                    )}
                                    {isCOD ? "Đã thu COD & Hoàn thành" : "Xác nhận đã giao"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─── Detail Drawer ────────────────────────────────────────── */}
            <DetailDrawer
                order={selectedOrder}
                open={drawerOpen}
                onClose={closeDrawer}
                onComplete={(orderId) => {
                    console.debug("Drawer delivery completion triggered for order ID:", orderId);
                    if (selectedOrder) {
                        triggerCompleteDelivery(selectedOrder);
                    }
                }}
                isActioning={selectedOrder ? actioningIds.has(selectedOrder._id) : false}
            />

            {/* Modal Xác nhận đã giao */}
            {confirmModalData.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => {
                            const isModalActioning = confirmModalData.orderId ? actioningIds.has(confirmModalData.orderId) : false;
                            if (!isModalActioning) {
                                setConfirmModalData((prev) => ({ ...prev, isOpen: false }));
                            }
                        }}
                    />
                    <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 z-10">
                        {/* Header Modal */}
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                <Truck className="w-5 h-5 text-orange-500" />
                            </div>
                            <h3 className="font-black text-slate-800 text-lg">Xác nhận đã giao hàng</h3>
                        </div>

                        {/* Body Modal */}
                        <div className="p-6 space-y-4 text-left">
                            <p className="text-slate-600 text-sm font-medium leading-relaxed">
                                Bạn xác nhận đã giao đơn hàng <span className="font-extrabold text-slate-900">#{confirmModalData.code.slice(-4)}</span> thành công?
                            </p>

                            {confirmModalData.isCOD ? (
                                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Số tiền cần thu (COD)</span>
                                    <span className="text-2xl font-black text-orange-600">{formatCurrency(confirmModalData.totalPrice)}</span>
                                </div>
                            ) : (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Trạng thái thanh toán</span>
                                    <span className="text-sm font-black text-emerald-700">Đã thanh toán trực tuyến</span>
                                </div>
                            )}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                            <button
                                onClick={() => setConfirmModalData((prev) => ({ ...prev, isOpen: false }))}
                                disabled={confirmModalData.orderId ? actioningIds.has(confirmModalData.orderId) : false}
                                className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 active:scale-95 transition-all text-sm disabled:opacity-50"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={async () => {
                                    const orderId = confirmModalData.orderId;
                                    if (orderId) {
                                        await handleCompleteDelivery(orderId);
                                    }
                                }}
                                disabled={confirmModalData.orderId ? actioningIds.has(confirmModalData.orderId) : false}
                                className={`flex-1 py-3 text-white font-bold rounded-xl active:scale-95 transition-all text-sm shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                                    confirmModalData.isCOD
                                        ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-orange-500/20"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/20"
                                }`}
                            >
                                {confirmModalData.orderId && actioningIds.has(confirmModalData.orderId) ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Đang lưu...
                                    </>
                                ) : (
                                    "Xác nhận đã giao"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}