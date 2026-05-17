import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

// ---- Types ----

export type OrderStep = 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'completed';

export interface OrderTimelineProps {
    currentStep: OrderStep;
    className?: string;
}

// ---- Config ----

const STEPS: { key: OrderStep; icon: string }[] = [
    { key: 'pending', icon: 'hourglass_empty' },
    { key: 'confirmed', icon: 'check_circle' },
    { key: 'preparing', icon: 'skillet' },
    { key: 'delivering', icon: 'delivery_dining' },
    { key: 'completed', icon: 'task_alt' },
];

// ---- Component ----

export function OrderTimeline({ currentStep, className }: OrderTimelineProps) {
    const { t } = useTranslation('customer');
    const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

    return (
        <div className={cn('flex flex-col gap-0', className)}>
            {STEPS.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                const isUpcoming = index > currentIndex;

                return (
                    <div key={step.key} className="flex items-stretch gap-4">
                        {/* Vertical Line + Circle */}
                        <div className="flex flex-col items-center w-10">
                            {/* Circle */}
                            <div
                                className={cn(
                                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0',
                                    isCompleted && 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30',
                                    isActive && 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30 scale-110',
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
                            {isActive && (
                                <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">
                                    {t('tracking.inProgress', 'Đang xử lý...')}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
