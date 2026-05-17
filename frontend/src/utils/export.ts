/**
 * Export utilities for Admin panel.
 * Used by Admin pages to export data to CSV files.
 */

export interface ExportColumn<T> {
    header: string;
    accessor: (row: T) => string | number;
}

/**
 * Export data to CSV and trigger a download.
 *
 * @example
 * ```ts
 * exportToCSV(orders, [
 *   { header: 'Mã đơn', accessor: (o) => o.orderNumber },
 *   { header: 'Tổng tiền', accessor: (o) => o.totalAmount },
 * ], 'orders.csv');
 * ```
 */
export function exportToCSV<T>(
    data: T[],
    columns: ExportColumn<T>[],
    filename: string
): void {
    if (data.length === 0) return;

    // BOM for UTF-8
    const BOM = '\uFEFF';
    const headers = columns.map((c) => `"${c.header}"`).join(',');
    const rows = data.map((row) =>
        columns
            .map((col) => {
                const value = col.accessor(row);
                // Escape double quotes
                const str = String(value).replace(/"/g, '""');
                return `"${str}"`;
            })
            .join(',')
    );

    const csv = BOM + [headers, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
