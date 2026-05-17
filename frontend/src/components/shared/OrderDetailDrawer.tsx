import { useTranslation } from 'react-i18next';

// ---- Types ----

export interface OrderDetailItem {
    name: string;
    quantity: number;
    price: number;
    size?: string;
    extras?: string[];
    note?: string;
}

export interface OrderDetailData {
    id: string;
    orderNumber: string;
    customerName: string;
    customerPhone?: string;
    items: OrderDetailItem[];
    totalAmount: number;
    shippingFee: number;
    discount: number;
    paymentMethod: string;
    address: string;
    note?: string;
    status: string;
    createdAt: string;
}

interface OrderDetailDrawerProps {
    order: OrderDetailData | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusChange?: (orderId: string, newStatus: string) => void;
}

// ---- Component ----

export function OrderDetailDrawer({ order, isOpen, onClose, onStatusChange }: OrderDetailDrawerProps) {
    const { t } = useTranslation(['common']);

    if (!order) return null;

    const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';
    const formatDate = (dateStr: string) =>
        new Date(dateStr).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });

    const statusActions: Record<string, { label: string; next: string; color: string }> = {
        pending: { label: 'Xác nhận đơn', next: 'preparing', color: 'bg-blue-600 hover:bg-blue-500' },
        preparing: { label: 'Sẵn sàng giao', next: 'ready', color: 'bg-emerald-600 hover:bg-emerald-500' },
        ready: { label: 'Đã giao cho shipper', next: 'delivering', color: 'bg-purple-600 hover:bg-purple-500' },
    };

    const action = statusActions[order.status];

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-50 transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
                        <div>
                            <h2 className="font-black text-lg text-foreground">
                                #{order.orderNumber}
                            </h2>
                            <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-xl hover:bg-accent flex items-center justify-center transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                        {/* Customer */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {t('common:customer', 'Khách hàng')}
                            </h3>
                            <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
                                <p className="font-semibold text-sm text-foreground">{order.customerName}</p>
                                {order.customerPhone && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-[16px]">phone</span>
                                        {order.customerPhone}
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground flex items-start gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] mt-0.5">location_on</span>
                                    {order.address}
                                </p>
                            </div>
                        </section>

                        {/* Items */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {t('common:orderItems', 'Danh sách món')}
                            </h3>
                            <div className="space-y-2.5">
                                {order.items.map((item, idx) => (
                                    <div key={idx} className="flex items-start justify-between py-2 border-b border-border/40 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-foreground">
                                                {item.quantity}x {item.name}
                                            </p>
                                            {item.size && (
                                                <p className="text-xs text-muted-foreground mt-0.5">Size: {item.size}</p>
                                            )}
                                            {item.extras && item.extras.length > 0 && (
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    + {item.extras.join(', ')}
                                                </p>
                                            )}
                                            {item.note && (
                                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">sticky_note_2</span>
                                                    {item.note}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-sm font-bold text-foreground ml-3">
                                            {formatPrice(item.price * item.quantity)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Order Note */}
                        {order.note && (
                            <section>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                    {t('common:note', 'Ghi chú')}
                                </h3>
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
                                    <p className="text-sm text-amber-800 dark:text-amber-200">{order.note}</p>
                                </div>
                            </section>
                        )}

                        {/* Summary */}
                        <section>
                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {t('common:summary', 'Tổng kết')}
                            </h3>
                            <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('common:subtotal', 'Tạm tính')}</span>
                                    <span className="font-medium">{formatPrice(order.totalAmount - order.shippingFee + order.discount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{t('common:shipping', 'Phí giao hàng')}</span>
                                    <span className="font-medium">{formatPrice(order.shippingFee)}</span>
                                </div>
                                {order.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('common:discount', 'Giảm giá')}</span>
                                        <span className="font-medium text-emerald-600">-{formatPrice(order.discount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                                    <span>{t('common:total', 'Tổng cộng')}</span>
                                    <span className="text-orange-600">{formatPrice(order.totalAmount)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                    <span className="material-symbols-outlined text-[14px]">payments</span>
                                    {order.paymentMethod === 'cod' ? 'Tiền mặt (COD)' : order.paymentMethod.toUpperCase()}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Footer Action */}
                    {action && onStatusChange && (
                        <div className="px-6 py-4 border-t border-border bg-card">
                            <button
                                onClick={() => onStatusChange(order.id, action.next)}
                                className={`w-full h-12 rounded-xl text-white font-bold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${action.color}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                                {action.label}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
