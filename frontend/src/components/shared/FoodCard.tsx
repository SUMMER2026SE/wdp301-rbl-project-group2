import type { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, Clock, Sparkles, AlertTriangle, Check, Plus } from 'lucide-react';
import { showAddToCartFeedback } from '@/utils/flyToCart';

// ---- Types ----

export type HealthStatus = 'safe' | 'warning' | 'danger';

export interface FoodCardProps {
    id: string;
    name: string;
    image: string;
    price: number;
    originalPrice?: number;
    rating: number;
    restaurant?: string;
    time?: string;
    description?: string;
    tags?: string[];
    healthStatus?: HealthStatus;
    allergenInfo?: string;
    variant?: 'vertical' | 'horizontal';
    customBadge?: {
        text: string;
        icon?: React.ReactNode;
        className?: string;
    };
    progress?: {
        value: number;
        label: string;
    };
    onAddToCart?: (id: string) => void;
    className?: string;
}

// ---- Helpers ----

const formatPrice = (price: number) =>
    price.toLocaleString('vi-VN') + '\u0111';

// ---- Component ----

export function FoodCard({
    id,
    name,
    image,
    price,
    originalPrice,
    rating = 0,
    restaurant,
    time,
    description,
    tags,
    healthStatus = 'safe',
    allergenInfo,
    variant = 'vertical',
    customBadge,
    progress,
    onAddToCart,
    className = '',
}: FoodCardProps) {
    const navigate = useNavigate();
    const { t } = useTranslation(['customer', 'common']);

    const isDanger = healthStatus === 'danger';
    const isWarning = healthStatus === 'warning';
    const isHorizontal = variant === 'horizontal';

    const handleAddClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!onAddToCart) return;
        showAddToCartFeedback(
            e.currentTarget,
            image,
            t('customer:foodCard.addedToCart', 'ÄÃ£ thÃªm sáº£n pháº©m vÃ o giá» hÃ ng!'),
        );
        onAddToCart(id);
    };

    const discountPercentage = originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : null;

    if (isHorizontal) {
        return (
            <div
                className={`group flex bg-white rounded-2xl p-4 gap-4 shadow-sm border border-orange-50 hover:shadow-xl hover:shadow-orange-500/10 transition-all cursor-pointer ${className}`}
                onClick={() => navigate(`/food/${id}`)}
            >
                {/* Image */}
                <div className="relative w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-orange-50">
                    <img
                        src={image}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {discountPercentage && (
                        <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg shadow-sm">
                            -{discountPercentage}%
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1 justify-between min-w-0">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            {customBadge ? (
                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${customBadge.className || 'bg-orange-100 text-orange-700'}`}>
                                    {customBadge.icon || <Sparkles className="w-3 h-3" />}
                                    {customBadge.text}
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                                    <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                                    {(rating ?? 0).toFixed(1)}
                                </div>
                            )}
                            {!customBadge && time && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                    <Clock className="w-3 h-3" />
                                    {time}
                                </div>
                            )}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1 line-clamp-1 group-hover:text-orange-600 transition-colors">
                            {name}
                        </h3>
                        {description && (
                            <p className="text-xs text-slate-500 line-clamp-2">
                                {description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-end justify-between mt-2">
                        <div className="flex flex-col">
                            {originalPrice && (
                                <span className="text-xs text-slate-400 line-through">
                                    {formatPrice(originalPrice)}
                                </span>
                            )}
                            <span className="font-black text-lg text-orange-600">
                                {formatPrice(price)}
                            </span>
                        </div>
                        {onAddToCart && (
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center hover:bg-orange-700 shadow-lg shadow-orange-600/10 active:scale-90 transition-all shrink-0 cursor-pointer"
                                aria-label={t('customer:foodCard.addToCart')}
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default Vertical Layout
    return (
        <div
            className={`group relative bg-card rounded-3xl overflow-hidden border border-border shadow-sm hover:shadow-2xl hover:shadow-orange-900/5 transition-all duration-500 cursor-pointer ${className}`}
            onClick={() => navigate(`/food/${id}`)}
        >
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden m-2 rounded-2xl">
                <img
                    src={image}
                    alt={name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                {/* Badges Overlay */}
                <div className="absolute top-3 inset-x-3 flex justify-between items-start">
                    <div className="flex flex-col gap-2">
                        {/* Health Warnings */}
                        {isDanger ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg border border-amber-200 shadow-sm flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {allergenInfo || 'Dá»‹ á»©ng'}
                            </span>
                        ) : isWarning ? (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg border border-amber-200 shadow-sm flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {allergenInfo || 'Cáº©n trá»ng'}
                            </span>
                        ) : healthStatus === 'safe' && tags?.some(tag => ['healthy', 'Healthy', 'lÃ nh máº¡nh'].includes(tag)) ? (
                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                                <Check className="w-3 h-3" /> Healthy
                            </span>
                        ) : null}

                        {/* Custom Badge */}
                        {customBadge && (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shadow-md flex items-center gap-1 ${customBadge.className || 'bg-white/90 backdrop-blur text-slate-800'}`}>
                                {customBadge.icon}
                                {customBadge.text}
                            </span>
                        )}
                    </div>

                    {/* Discount Badge */}
                    {discountPercentage && (
                        <span className="bg-red-600 text-white text-xs font-black px-2 py-1 rounded-lg shadow-lg animate-pulse">
                            -{discountPercentage}%
                        </span>
                    )}
                </div>

                {/* Rating & Time Overlay */}
                <div className="absolute bottom-3 inset-x-3 flex justify-between items-center">
                    <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                        <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                        {(rating ?? 0).toFixed(1)}
                    </div>
                    {time && (
                        <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-orange-400" />
                            {time}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pt-2">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-slate-900 text-lg font-bold line-clamp-1 group-hover:text-orange-600 transition-colors uppercase tracking-tight">
                            {name}
                        </h3>
                        {restaurant && (
                            <p className="text-slate-400 text-xs font-medium line-clamp-1 mt-0.5">
                                {restaurant}
                            </p>
                        )}
                    </div>
                </div>

                {/* Progress for Flash Sale */}
                {progress && (
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {progress.label}
                            </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
                                style={{ width: `${progress.value}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                    <div className="flex flex-col">
                        {originalPrice && (
                            <span className="text-xs text-slate-400 line-through decoration-red-400/50">
                                {formatPrice(originalPrice)}
                            </span>
                        )}
                        <span className="text-orange-600 font-black text-xl tracking-tighter">
                            {formatPrice(price)}
                        </span>
                    </div>

                    {onAddToCart && (
                        <button
                            type="button"
                            onClick={handleAddClick}
                            className="h-10 px-4 rounded-full bg-orange-600 text-white flex items-center gap-1.5 hover:bg-orange-700 shadow-lg shadow-orange-600/20 active:scale-95 transition-all group/btn cursor-pointer"
                            aria-label={t('customer:foodCard.addToCart')}
                        >
                            <Plus className="w-4 h-4 group-hover/btn:rotate-90 transition-transform duration-300" />
                            <span className="text-sm font-bold">{t('customer:foodCard.addToCart', 'ThÃªm')}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
