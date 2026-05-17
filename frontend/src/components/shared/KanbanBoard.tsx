import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---- Types ----

export type KanbanStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface KanbanItem {
    id: string;
    orderNumber: string;
    customerName: string;
    items: { name: string; quantity: number }[];
    totalAmount: number;
    status: KanbanStatus;
    note?: string;
    createdAt: string;
}

interface KanbanBoardProps {
    orders: KanbanItem[];
    onStatusChange: (orderId: string, newStatus: KanbanStatus) => void;
    onOrderClick: (orderId: string) => void;
}

// ---- Config ----

const COLUMNS: { key: KanbanStatus; icon: string; color: string; bgColor: string }[] = [
    { key: 'pending', icon: 'hourglass_empty', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
    { key: 'preparing', icon: 'skillet', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
    { key: 'ready', icon: 'package_2', color: 'text-emerald-600', bgColor: 'bg-emerald-50 border-emerald-200' },
    { key: 'delivered', icon: 'check_circle', color: 'text-slate-500', bgColor: 'bg-slate-50 border-slate-200' },
];

const COLUMN_LABELS: Record<KanbanStatus, string> = {
    pending: 'Chờ xác nhận',
    preparing: 'Đang nấu',
    ready: 'Chờ giao',
    delivered: 'Đã giao',
};

// ---- Component ----

export function KanbanBoard({ orders, onStatusChange, onOrderClick }: KanbanBoardProps) {
    const { t } = useTranslation(['common']);
    const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null);

    const handleDragStart = (e: React.DragEvent, orderId: string) => {
        e.dataTransfer.setData('orderId', orderId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, column: KanbanStatus) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverColumn(column);
    };

    const handleDragLeave = () => {
        setDragOverColumn(null);
    };

    const handleDrop = (e: React.DragEvent, newStatus: KanbanStatus) => {
        e.preventDefault();
        const orderId = e.dataTransfer.getData('orderId');
        if (orderId) {
            onStatusChange(orderId, newStatus);
        }
        setDragOverColumn(null);
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    const formatPrice = (price: number) => price.toLocaleString('vi-VN') + 'đ';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full">
            {COLUMNS.map((col) => {
                const columnOrders = orders.filter((o) => o.status === col.key);
                const isDragOver = dragOverColumn === col.key;

                return (
                    <div
                        key={col.key}
                        onDragOver={(e) => handleDragOver(e, col.key)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, col.key)}
                        className={`flex flex-col rounded-2xl border-2 transition-all duration-200 ${isDragOver
                            ? 'border-primary bg-primary/5 scale-[1.01]'
                            : col.bgColor
                            }`}
                    >
                        {/* Column Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                            <div className="flex items-center gap-2">
                                <span className={`material-symbols-outlined text-[20px] ${col.color}`}>
                                    {col.icon}
                                </span>
                                <h3 className="font-bold text-sm text-foreground">
                                    {t(`staff.kanban.${col.key}`, COLUMN_LABELS[col.key])}
                                </h3>
                            </div>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.color} bg-white/60`}>
                                {columnOrders.length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[200px]">
                            {columnOrders.map((order) => (
                                <div
                                    key={order.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, order.id)}
                                    onClick={() => onOrderClick(order.id)}
                                    className="bg-card rounded-xl p-3.5 border border-border shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-all hover:border-primary/30 active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-sm text-foreground">#{order.orderNumber}</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            {formatTime(order.createdAt)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground font-medium mb-2 line-clamp-1">
                                        {order.customerName}
                                    </p>
                                    <div className="space-y-0.5 mb-2">
                                        {order.items.slice(0, 3).map((item, idx) => (
                                            <p key={idx} className="text-xs text-foreground/80">
                                                {item.quantity}x {item.name}
                                            </p>
                                        ))}
                                        {order.items.length > 3 && (
                                            <p className="text-[10px] text-muted-foreground">
                                                +{order.items.length - 3} {t('common:more', 'món khác')}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                        <span className="font-bold text-sm text-orange-600">{formatPrice(order.totalAmount)}</span>
                                        {order.note && (
                                            <span className="material-symbols-outlined text-amber-500 text-[16px]" title={order.note}>
                                                sticky_note_2
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {columnOrders.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                                    <span className="material-symbols-outlined text-3xl mb-1">inbox</span>
                                    <span className="text-xs font-medium">{t('common:empty.title', 'Trống')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
