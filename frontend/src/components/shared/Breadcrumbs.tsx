import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// ---- Types ----

interface BreadcrumbsProps {
    /** Custom items override auto-generation */
    items?: { label: string; path?: string }[];
    className?: string;
}

// ---- Route label map ----

const ROUTE_LABELS: Record<string, string> = {
    admin: 'Admin',
    operations: 'Vận hành',
    orders: 'Đơn hàng',
    dispatch: 'Điều phối',
    shifts: 'Ca làm việc',
    catalog: 'Menu & AI',
    products: 'Sản phẩm',
    categories: 'Danh mục',
    ingredients: 'Nguyên liệu',
    crm: 'Khách hàng',
    customers: 'Danh sách KH',
    reviews: 'Đánh giá',
    marketing: 'Marketing',
    vouchers: 'Vouchers',
    posts: 'Bài viết',
    system: 'Hệ thống',
    staff: 'Nhân viên',
    settings: 'Cài đặt',
    dashboard: 'Tổng quan',
    analytics: 'Thống kê',
    inventory: 'Tồn kho',
    delivery: 'Giao hàng',
    menu: 'Thực đơn',
};

// ---- Component ----

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    const location = useLocation();
    const { t } = useTranslation(['common']);

    // Auto-generate from current path
    const breadcrumbs = items || (() => {
        const parts = location.pathname.split('/').filter(Boolean);
        return parts.map((part, idx) => ({
            label: ROUTE_LABELS[part] || t(`common:breadcrumb.${part}`, part),
            path: idx < parts.length - 1 ? '/' + parts.slice(0, idx + 1).join('/') : undefined,
        }));
    })();

    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className={`flex items-center gap-1.5 text-xs text-muted-foreground font-medium ${className}`}>
            {breadcrumbs.map((item, index) => (
                <span key={index} className="flex items-center gap-1.5">
                    {index > 0 && (
                        <span className="material-symbols-outlined text-[12px] opacity-40">chevron_right</span>
                    )}
                    {item.path ? (
                        <Link
                            to={item.path}
                            className="hover:text-foreground transition-colors"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-foreground font-semibold">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    );
}
