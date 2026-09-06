'use client';

import { CloudOff, RefreshCw, WifiOff } from 'lucide-react';

/**
 * A dropped subscription is a lasting condition, not an event, so it gets a
 * persistent banner rather than a toast. Recovery is the event, and that is
 * what gets the toast.
 */
export default function SyncStatusBanner({
    state,
    onRetry,
    isRetrying,
}: {
    state: 'offline' | 'interrupted';
    onRetry: () => void;
    isRetrying: boolean;
}) {
    const offline = state === 'offline';
    const Icon = offline ? WifiOff : CloudOff;

    return (
        <div
            role="status"
            className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm"
        >
            <Icon size={16} className="flex-shrink-0 text-amber-500" />
            <p className="min-w-0 flex-1 text-foreground">
                {offline ? (
                    <>
                        You&apos;re offline.{' '}
                        <span className="text-muted-foreground">
                            Notes you open are cached, but nothing will save or
                            sync until you reconnect.
                        </span>
                    </>
                ) : (
                    <>
                        Live sync interrupted.{' '}
                        <span className="text-muted-foreground">
                            Changes made on other devices won&apos;t appear
                            until this reconnects.
                        </span>
                    </>
                )}
            </p>
            {!offline && (
                <button
                    onClick={onRetry}
                    disabled={isRetrying}
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-500/10 disabled:opacity-60"
                >
                    <RefreshCw
                        size={13}
                        className={isRetrying ? 'animate-spin' : ''}
                    />
                    {isRetrying ? 'Reconnecting...' : 'Retry now'}
                </button>
            )}
        </div>
    );
}
