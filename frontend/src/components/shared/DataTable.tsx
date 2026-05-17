import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import useDebounce from '@/hooks/useDebounce';

// ---- Types ----

export interface DataTableColumn<T> {
    key: string;
    header: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
    className?: string;
}

export interface QuickFilter {
    key: string;
    label: string;
    icon?: string;
    count?: number;
}

interface DataTableProps<T> {
    data: T[];
    columns: DataTableColumn<T>[];
    idField?: keyof T;
    searchPlaceholder?: string;
    quickFilters?: QuickFilter[];
    activeFilter?: string;
    onFilterChange?: (filterKey: string) => void;
    onRowClick?: (row: T) => void;
    loading?: boolean;
    emptyMessage?: string;
    actions?: React.ReactNode;
    /** Total items for server-side pagination */
    totalItems?: number;
    page?: number;
    pageSize?: number;
    onPageChange?: (page: number) => void;
}

// ---- Component ----

export function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    idField = 'id' as keyof T,
    searchPlaceholder,
    quickFilters,
    activeFilter,
    onFilterChange,
    onRowClick,
    loading = false,
    emptyMessage,
    actions,
    totalItems,
    page = 1,
    pageSize = 10,
    onPageChange,
}: DataTableProps<T>) {
    const { t } = useTranslation(['common']);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const debouncedSearch = useDebounce(searchQuery, 300);

    // Client-side filter & sort
    const processedData = useMemo(() => {
        let result = [...data];

        // Search filter (client-side fallback)
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            result = result.filter((row) =>
                Object.values(row).some((val) =>
                    String(val).toLowerCase().includes(q)
                )
            );
        }

        // Sort
        if (sortKey) {
            result.sort((a, b) => {
                const aVal = a[sortKey] as string | number;
                const bVal = b[sortKey] as string | number;
                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [data, debouncedSearch, sortKey, sortDirection]);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const totalPages = totalItems ? Math.ceil(totalItems / pageSize) : 1;

    return (
        <div className="flex flex-col gap-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-[18px]">
                        search
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={searchPlaceholder || t('common:search', 'Tìm kiếm...')}
                        className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                {/* Actions */}
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* Quick Filters */}
            {quickFilters && quickFilters.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {quickFilters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => onFilterChange?.(f.key)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${activeFilter === f.key
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-card border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                                }`}
                        >
                            {f.icon && <span className="material-symbols-outlined text-[14px]">{f.icon}</span>}
                            {f.label}
                            {f.count !== undefined && (
                                <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                    {f.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable && handleSort(col.key)}
                                        className={`px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider ${col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
                                            } ${col.className || ''}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.header}
                                            {col.sortable && sortKey === col.key && (
                                                <span className="material-symbols-outlined text-[14px]">
                                                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                // Skeleton rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        {columns.map((col) => (
                                            <td key={col.key} className="px-4 py-3">
                                                <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : processedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                            <span className="material-symbols-outlined text-3xl opacity-40">inbox</span>
                                            <span className="text-sm font-medium">
                                                {emptyMessage || t('common:empty.title', 'Không có dữ liệu')}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                processedData.map((row) => (
                                    <tr
                                        key={String(row[idField])}
                                        onClick={() => onRowClick?.(row)}
                                        className={`border-b border-border/50 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-accent/50' : ''
                                            }`}
                                    >
                                        {columns.map((col) => (
                                            <td key={col.key} className={`px-4 py-3 text-foreground ${col.className || ''}`}>
                                                {col.render
                                                    ? col.render(row)
                                                    : String(row[col.key] ?? '')}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {onPageChange && totalItems && totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                        <p className="text-xs text-muted-foreground">
                            {t('common:showing', 'Hiển thị')} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalItems)} / {totalItems}
                        </p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onPageChange(page - 1)}
                                disabled={page <= 1}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                const p = i + 1;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => onPageChange(p)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${p === page
                                            ? 'bg-primary text-primary-foreground'
                                            : 'hover:bg-accent text-muted-foreground'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => onPageChange(page + 1)}
                                disabled={page >= totalPages}
                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
