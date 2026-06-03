import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { itemKey, type CartItem } from '@/store/cartStore';

const PREVIEW_LIMIT = 5;
const HOVER_LEAVE_DELAY_MS = 150;

interface CartPreviewDropdownProps {
    items: CartItem[];
    totalPrice: number;
    children: ReactNode;
}

export function CartPreviewDropdown({ items, totalPrice, children }: CartPreviewDropdownProps) {
    const { t } = useTranslation(['customer', 'common']);
    const [open, setOpen] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const previewItems = items.slice(0, PREVIEW_LIMIT);
    const remainingCount = Math.max(0, items.length - PREVIEW_LIMIT);

    const handleEnter = () => {
        if (leaveTimer.current) {
            clearTimeout(leaveTimer.current);
            leaveTimer.current = null;
        }
        setOpen(true);
    };

    const handleLeave = () => {
        leaveTimer.current = setTimeout(() => setOpen(false), HOVER_LEAVE_DELAY_MS);
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
        >
            {children}

            {open && (
                <div
                    className="absolute right-0 top-full mt-2 w-[min(100vw-24px,20rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-1 duration-200"
                    role="dialog"
                    aria-label={t('customer:cart.title')}
                >
                    <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
                        <h3 className="font-bold text-gray-900 text-sm">
                            {t('customer:cart.previewTitle', 'Giỏ hàng của bạn')}
                        </h3>
                        {items.length > 0 && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {items.length} {t('customer:cart.item', 'Sản phẩm')}
                            </p>
                        )}
                    </div>

                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                        {items.length === 0 ? (
                            <div className="px-4 py-8 text-center">
                                <span className="material-symbols-outlined text-[40px] text-orange-200">
                                    shopping_cart
                                </span>
                                <p className="text-sm font-semibold text-gray-600 mt-2">
                                    {t('customer:cart.empty', 'Giỏ hàng trống')}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {t('customer:cart.emptyDescription')}
                                </p>
                            </div>
                        ) : (
                            <ul className="py-1">
                                {previewItems.map((item) => (
                                    <li
                                        key={itemKey(item)}
                                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-orange-50/60 transition-colors"
                                    >
                                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-orange-50 shrink-0 border border-orange-100">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-orange-300">
                                                    <span className="material-symbols-outlined text-[20px]">
                                                        restaurant
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">
                                                {item.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                x{item.quantity}
                                            </p>
                                        </div>
                                        <span className="text-sm font-bold text-orange-600 shrink-0">
                                            {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                                        </span>
                                    </li>
                                ))}
                                {remainingCount > 0 && (
                                    <li className="px-4 py-2 text-xs font-semibold text-gray-500 text-center border-t border-gray-50">
                                        {t('customer:cart.moreItems', '+{{count}} món khác', {
                                            count: remainingCount,
                                        })}
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80 space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">{t('customer:cart.subtotal')}</span>
                                <span className="font-black text-orange-600">
                                    {totalPrice.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <Link
                                to="/cart"
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
                            >
                                {t('customer:cart.viewCart', 'Xem giỏ hàng')}
                                <span className="material-symbols-outlined text-[18px]">
                                    arrow_forward
                                </span>
                            </Link>
                        </div>
                    )}

                    {items.length === 0 && (
                        <div className="px-4 pb-3">
                            <Link
                                to="/menu"
                                className="flex items-center justify-center w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold transition-colors"
                            >
                                {t('customer:cart.browsMenu')}
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
