import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { type Order } from '@/services/order.service';

// ---- Types ----

export type OrderStep = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'completed';

export interface OrderTimelineProps {
    currentStep: OrderStep;
    order?: Order;
    className?: string;
}

// ---- Config ----

const STEPS: { key: OrderStep; icon: string }[] = [
    { key: 'pending', icon: 'hourglass_empty' },
    { key: 'confirmed', icon: 'check_circle' },
    { key: 'preparing', icon: 'skillet' },
    { key: 'delivering', icon: 'delivery_dining' },
    { key: 'delivered', icon: 'home' },
    { key: 'completed', icon: 'task_alt' },
];

// ---- Helpers ----

const formatTime = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const timeStr = d.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const dateStr = d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    return `${timeStr} - ${dateStr}`;
};

const getMilestoneTimes = (order?: Order) => {
    const times: Record<OrderStep, string | Date | null> = {
        pending: null,
        confirmed: null,
        preparing: null,
        delivering: null,
        delivered: null,
        completed: null,
    };

    if (!order) return times;

    times.pending = order.createdAt;

    if (order.statusHistory && Array.isArray(order.statusHistory)) {
        for (const history of order.statusHistory) {
            const status = history.status;
            const timestamp = history.createdAt;
            if (timestamp) {
                if (status === 'confirmed') times.confirmed = timestamp;
                if (status === 'processing' || status === 'preparing') times.preparing = timestamp;
                if (status === 'shipping' || status === 'delivering') times.delivering = timestamp;
                if (status === 'delivered') times.delivered = timestamp;
                if (status === 'completed') times.completed = timestamp;
            }
        }
    }

    // Fallbacks
    if (!times.confirmed && order.payment?.paidAt) times.confirmed = order.payment.paidAt;
    if (!times.delivering && order.deliveryInfo?.shippedAt) times.delivering = order.deliveryInfo.shippedAt;
    if (!times.delivered && order.deliveryInfo?.deliveredAt) times.delivered = order.deliveryInfo.deliveredAt;
    if (!times.completed && order.status === 'completed') times.completed = order.updatedAt;
    if (order.status === 'delivered' && !times.delivered) times.delivered = order.updatedAt;
    if (order.status === 'confirmed' && !times.confirmed) times.confirmed = order.updatedAt;

    return times;
};

// ---- Component ----

export function OrderTimeline({ currentStep, order, className }: OrderTimelineProps) {
    const { t } = useTranslation('customer');
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
    const milestoneTimes = getMilestoneTimes(order);

    return (
        <div className={cn('flex flex-col gap-0', className)}>
            {STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                const isUpcoming = index > currentIndex;
                const stepTime = milestoneTimes[step.key];

                return (
                    <div key={step.key} className="flex items-stretch gap-4">
                        {/* Vertical Line + Circle */}
                        <div className="flex flex-col items-center w-10">
                            {/* Circle */}
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0',
                                    isCompleted && 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30',
                                    isActive && cn(
                                        'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110',
                                        step.key === 'delivered' && 'animate-pulse'
                                    ),
                                    isUpcoming && 'bg-card border-border text-muted-foreground'
                                )}
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isCompleted ? 'check' : step.icon}
                                </span>
                            </div>
                            {/* Connector Line */}
                            {index < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'w-0.5 flex-1 min-h-[32px] transition-colors duration-300',
                                        index < currentIndex ? 'bg-emerald-400' : 'bg-border'
                                    )}
                                />
                            )}
                        </div>

                        {/* Label */}
                        <div className={cn(
                            'pt-2 pb-6',
                            isActive && 'pb-8'
                        )}>
                            <p className={cn(
                                'text-sm font-semibold transition-colors',
                                isCompleted && 'text-emerald-600 dark:text-emerald-400',
                                isActive && 'text-orange-600 dark:text-orange-400 font-bold text-base',
                                isUpcoming && 'text-muted-foreground'
                            )}>
                                {t(`tracking.status.${step.key}`)}
                            </p>
                            {stepTime && (
                                <p className="text-xs text-muted-foreground/80 mt-1 font-medium">
                                    {formatTime(stepTime)}
                                </p>
                            )}
                            {isActive && (
                                <p className={cn(
                                    "text-xs mt-1 animate-pulse",
                                    step.key === 'delivered' ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-muted-foreground"
                                )}>
                                    {step.key === 'delivered'
                                        ? t('tracking.confirmReceiptPrompt', 'Vui lòng xác nhận đã nhận hàng')
                                        : t('tracking.inProgress', 'Đang xử lý...')}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
