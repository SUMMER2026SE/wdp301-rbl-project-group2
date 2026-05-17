import * as React from "react"
import { cn } from "../../lib/utils"

interface DialogProps {
    open: boolean
    onClose: () => void
    children: React.ReactNode
    className?: string
}

function Dialog({ open, onClose, children, className }: DialogProps) {
    // Close on Escape key
    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
        }
        if (open) {
            document.addEventListener("keydown", handler)
            document.body.style.overflow = "hidden"
        }
        return () => {
            document.removeEventListener("keydown", handler)
            document.body.style.overflow = ""
        }
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
                onClick={onClose}
            />
            {/* Content */}
            <div
                className={cn(
                    "relative z-50 w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl animate-in fade-in zoom-in-95",
                    className
                )}
            >
                {children}
            </div>
        </div>
    )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left mb-4", className)} {...props} />
    )
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
    )
}

function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)} {...props} />
    )
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4", className)} {...props} />
    )
}

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter }
