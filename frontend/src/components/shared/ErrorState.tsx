import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ErrorStateProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    className?: string;
}

/**
 * Reusable error state for API failures, network errors, etc.
 * Shows icon + message + Retry button.
 */
export function ErrorState({
    title,
    description,
    onRetry,
    className,
}: ErrorStateProps) {
    const { t } = useTranslation('common');

    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-16 px-6 text-center',
                className
            )}
        >
            <div className="mb-4 text-destructive/60">
                <AlertTriangle size={64} strokeWidth={1.2} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
                {title ?? t('error.title')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                {description ?? t('error.description')}
            </p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                    {t('actions.retry')}
                </button>
            )}
        </div>
    );
}
