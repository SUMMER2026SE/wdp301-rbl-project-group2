import { useState } from 'react';
import { useTranslation } from 'react-i18next';

// ---- Types ----

export interface TicketVoucherProps {
    code: string;
    title: string;
    description?: string;
    discountValue: string;
    minOrder?: string;
    expiryDate?: string;
    isUsed?: boolean;
    isExpired?: boolean;
    onCopy?: (code: string) => void;
    onUse?: (code: string) => void;
    className?: string;
}

// ---- Component ----

export function TicketVoucher({
    code,
    title,
    description,
    discountValue,
    minOrder,
    expiryDate,
    isUsed = false,
    isExpired = false,
    onCopy,
    onUse,
    className = '',
}: TicketVoucherProps) {
    const { t } = useTranslation(['customer', 'common']);
    const [copied, setCopied] = useState(false);

    const isDisabled = isUsed || isExpired;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onCopy?.(code);
    };

    return (
        <div
            className={`relative flex min-h-[110px] overflow-hidden rounded-2xl border ${isDisabled
                ? 'border-gray-200 bg-gray-50 dark:bg-gray-800/50 opacity-70 text-gray-400'
                : 'border-orange-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-orange-400 dark:hover:border-orange-500/50 hover:shadow-xl hover:shadow-orange-500/5'
            } transition-all duration-300 ${className}`}
        >
            {/* Left — Discount Value Section */}
            <div className={`flex flex-col items-center justify-center px-4 w-[120px] shrink-0 relative overflow-hidden ${isDisabled
                ? 'bg-gray-100 dark:bg-gray-800'
                : 'bg-primary'
                }`}
            >
                {/* Decorative circles for punch-hole effect */}
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-[#1a1c1e]" />
                
                <span className={`text-2xl font-black text-center leading-none ${isDisabled ? 'text-gray-400' : 'text-white'}`}>
                    {discountValue}
                </span>
                {minOrder && (
                    <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-tighter text-center ${isDisabled ? 'text-gray-400' : 'text-orange-100'}`}>
                        {minOrder}
                    </span>
                )}
            </div>

            {/* Right — Content Section */}
            <div className="flex-1 flex flex-col justify-between p-4 min-w-0">
                <div className="flex flex-col gap-1">
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1 leading-tight">{title}</h4>
                    {description && <p className="text-slate-400 dark:text-slate-500 text-[10px] line-clamp-1 mb-1">{description}</p>}
                    
                    <div className="flex items-center gap-2 mt-1">
                        {/* Code Display */}
                        <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-2 py-0.5 rounded-md">
                            <span className="font-mono font-black text-[10px] text-orange-600 tracking-wider uppercase">{code}</span>
                            <button onClick={handleCopy} className="text-slate-400 hover:text-orange-600 transition-colors flex items-center">
                                <span className="material-symbols-outlined text-[14px]">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                            </button>
                        </div>

                        {/* Expiry */}
                        {expiryDate && (
                            <div className="text-[9px] text-slate-400 flex items-center gap-0.5 bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                <span>{expiryDate}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions / Status */}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex flex-col">
                        {isUsed && (
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {t('customer:voucherWallet.used')}
                            </span>
                        )}
                        {isExpired && !isUsed && (
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                {t('customer:voucherWallet.expired')}
                            </span>
                        )}
                    </div>

                    {!isDisabled && onUse && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUse(code); }}
                            className="bg-primary/10 hover:bg-primary text-primary hover:text-white dark:bg-primary/20 dark:text-orange-400 dark:hover:text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                            {t('customer:voucherDetail.useNow')}
                        </button>
                    )}
                </div>
            </div>

            {/* Side decorative cutout */}
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-50 dark:bg-[#121417] border border-orange-100 dark:border-white/10" />
        </div>
    );
}
export default TicketVoucher;
