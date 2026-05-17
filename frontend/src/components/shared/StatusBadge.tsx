import { Badge } from '../ui/badge';
import type { VariantProps } from 'class-variance-authority';
import type { badgeVariants } from '../ui/badge';
import { useTranslation } from 'react-i18next';

/**
 * Order status values matching backend enum.
 */
export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'preparing'
    | 'delivering'
    | 'completed'
    | 'cancelled';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const statusConfig: Record<OrderStatus, { variant: BadgeVariant; icon: string }> = {
    pending: { variant: 'warning', icon: '⏳' },
    confirmed: { variant: 'info', icon: '✅' },
    preparing: { variant: 'info', icon: '🍳' },
    delivering: { variant: 'default', icon: '🛵' },
    completed: { variant: 'success', icon: '✔️' },
    cancelled: { variant: 'destructive', icon: '✖️' },
};

interface StatusBadgeProps {
    status: OrderStatus;
    className?: string;
    showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
    const { t } = useTranslation('customer');
    const config = statusConfig[status];
    const label = t(`tracking.status.${status}`);

    return (
        <Badge variant={config.variant} className={className}>
            {showIcon && <span className="mr-1">{config.icon}</span>}
            {label}
        </Badge>
    );
}
