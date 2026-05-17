import { useTranslation } from 'react-i18next';
import { PackageOpen } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
    title?: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

/**
 * Reusable empty state for lists, tables, and pages.
 * Shows icon + message + optional CTA button.
 */
export function EmptyState({
    title,
    description,
    icon,
    action,
    className,
}: EmptyStateProps) {
    const { t } = useTranslation('common');

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-16 px-6 text-center',
                className
            )}
        >
            <div className="mb-4 text-muted-foreground/40">
                {icon ?? <PackageOpen size={64} strokeWidth={1.2} />}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
                {title ?? t('empty.title')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {description ?? t('empty.description')}
            </p>
            {action && <div>{action}</div>}
        </div>
    );
}
