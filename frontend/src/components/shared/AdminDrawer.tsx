import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export const AdminDrawer: React.FC<AdminDrawerProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = 'max-w-2xl',
}) => {
    const [mounted, setMounted] = useState(false);

    // Sync body scroll with isOpen
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Sync mounted state
    if (isOpen && !mounted) {
        setMounted(true);
    }

    useEffect(() => {
        if (!isOpen && mounted) {
            const timer = setTimeout(() => {
                setMounted(false);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen, mounted]);

    if (!mounted && !isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-full bg-white dark:bg-gray-950 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-100 dark:border-gray-800",
                    width,
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight capitalize">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    {children}
                </div>
            </div>
        </>
    );
};
