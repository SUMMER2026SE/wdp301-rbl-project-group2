import { useState, useCallback, createContext, useContext } from 'react';

// ---- Types ----

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
}

interface ToastContextValue {
    toasts: Toast[];
    toast: (message: string, variant?: ToastVariant, duration?: number) => void;
    dismiss: (id: string) => void;
}

// ---- Context ----

const ToastContext = createContext<ToastContextValue | null>(null);

// ---- Hook ----

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        // Fallback if used outside provider — still functional
        const [toasts, setToasts] = useState<Toast[]>([]);

        const toast = useCallback((message: string, variant: ToastVariant = 'success', duration = 3000) => {
            const id = Date.now().toString();
            setToasts((prev) => [...prev, { id, message, variant, duration }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }, []);

        const dismiss = useCallback((id: string) => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, []);

        return { toasts, toast, dismiss };
    }
    return ctx;
}

// ---- Icons ----

const ICONS: Record<ToastVariant, string> = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

const COLORS: Record<ToastVariant, string> = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600',
};

// ---- Toast Container Component ----

export function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`pointer-events-auto flex items-center gap-3 px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-300 ${COLORS[t.variant]}`}
                    onClick={() => dismiss(t.id)}
                    role="alert"
                >
                    <span className="material-symbols-outlined text-[18px]">{ICONS[t.variant]}</span>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

export { ToastContext };
