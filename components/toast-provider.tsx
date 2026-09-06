'use client';

import * as React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import {
    Toast,
    ToastAction,
    ToastClose,
    ToastDescription,
    ToastProvider as ToastPrimitiveProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/toast';

type Variant = 'success' | 'error' | 'info';

type ToastOptions = {
    description?: string;
    duration?: number;
    action?: { label: string; onClick: () => void };
};

type ToastItem = ToastOptions & {
    id: string;
    variant: Variant;
    title: string;
    open: boolean;
};

type ToastFn = ((title: string, options?: ToastOptions) => string) & {
    success: (title: string, options?: ToastOptions) => string;
    error: (title: string, options?: ToastOptions) => string;
    info: (title: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastFn | null>(null);

// Errors stay up longer — they carry information the user has to read and may
// need to act on, unlike a "saved" confirmation.
const DEFAULT_DURATION = 4000;
const ERROR_DURATION = 8000;

const ICONS: Record<Variant, React.ElementType> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
};

const ICON_CLASS: Record<Variant, string> = {
    success: 'text-emerald-500',
    error: 'text-destructive',
    info: 'text-muted-foreground',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = React.useState<ToastItem[]>([]);

    const remove = React.useCallback((id: string) => {
        setToasts((current) => current.filter((t) => t.id !== id));
    }, []);

    // Closing animates out via data-state, then the node is dropped.
    const close = React.useCallback((id: string) => {
        setToasts((current) =>
            current.map((t) => (t.id === id ? { ...t, open: false } : t)),
        );
        setTimeout(() => remove(id), 250);
    }, [remove]);

    const toast = React.useMemo<ToastFn>(() => {
        const push = (
            variant: Variant,
            title: string,
            options: ToastOptions = {},
        ) => {
            const id =
                globalThis.crypto?.randomUUID?.() ??
                `${Date.now()}-${Math.random()}`;
            setToasts((current) => [
                // Cap the stack so a burst of failures can't cover the screen.
                ...current.slice(-2),
                { id, variant, title, open: true, ...options },
            ]);
            return id;
        };

        const fn = ((title: string, options?: ToastOptions) =>
            push('info', title, options)) as ToastFn;
        fn.success = (title, options) => push('success', title, options);
        fn.error = (title, options) => push('error', title, options);
        fn.info = (title, options) => push('info', title, options);
        fn.dismiss = (id: string) => close(id);
        return fn;
    }, [close]);

    return (
        <ToastContext.Provider value={toast}>
            <ToastPrimitiveProvider swipeDirection="right">
                {children}
                {toasts.map((t) => {
                    const Icon = ICONS[t.variant];
                    return (
                        <Toast
                            key={t.id}
                            variant={t.variant}
                            open={t.open}
                            duration={
                                t.duration ??
                                (t.variant === 'error'
                                    ? ERROR_DURATION
                                    : DEFAULT_DURATION)
                            }
                            onOpenChange={(open) => {
                                if (!open) close(t.id);
                            }}
                        >
                            <Icon
                                size={17}
                                className={`mt-0.5 flex-shrink-0 ${ICON_CLASS[t.variant]}`}
                            />
                            <div className="min-w-0 flex-1">
                                <ToastTitle>{t.title}</ToastTitle>
                                {t.description && (
                                    <ToastDescription>
                                        {t.description}
                                    </ToastDescription>
                                )}
                                {t.action && (
                                    <ToastAction
                                        altText={t.action.label}
                                        onClick={t.action.onClick}
                                    >
                                        {t.action.label}
                                    </ToastAction>
                                )}
                            </div>
                            <ToastClose />
                        </Toast>
                    );
                })}
                <ToastViewport />
            </ToastPrimitiveProvider>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastFn {
    const ctx = React.useContext(ToastContext);
    if (!ctx) {
        throw new Error('useToast must be used inside <ToastProvider>');
    }
    return ctx;
}
