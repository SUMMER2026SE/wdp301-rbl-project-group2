import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { exportToCSV, type ExportColumn } from '@/utils/export';

// ---- Types ----

interface ExportButtonProps<T> {
    data: T[];
    columns: ExportColumn<T>[];
    filename: string;
    label?: string;
}

// ---- Component ----

export function ExportButton<T>({ data, columns, filename, label }: ExportButtonProps<T>) {
    const { t } = useTranslation(['common']);
    const [exporting, setExporting] = useState(false);

    const handleExport = () => {
        setExporting(true);
        // Small delay for UX feedback
        setTimeout(() => {
            exportToCSV(data, columns, filename);
            setExporting(false);
        }, 300);
    };

    return (
        <button
            onClick={handleExport}
            disabled={exporting || data.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm font-semibold hover:bg-accent transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
            <span className="material-symbols-outlined text-[18px]">
                {exporting ? 'progress_activity' : 'download'}
            </span>
            {label || t('common:export', 'Xuất CSV')}
        </button>
    );
}
