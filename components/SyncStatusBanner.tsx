'use client';

import { CloudOff, CloudUpload, RefreshCw, WifiOff } from 'lucide-react';

/**
 * A dropped subscription is a lasting condition, not an event, so it gets a
 * persistent banner rather than a toast. Recovery is the event, and that is
 * what gets the toast.
 */
export default function SyncStatusBanner({
    state,
    onRetry,
    isRetrying,
    pendingCount = 0,
    healthy = false,
}: {
    state: 'offline' | 'interrupted';
    onRetry: () => void;
    isRetrying: boolean;
    /** Writes saved on this device and not yet on the server. */
    pendingCount?: number;
    /** The connection is fine and this is only reporting the queue. */
    healthy?: boolean;
}) {
    const offline = state === 'offline';

    // A healthy connection with a queue still draining is not a warning, so it
    // does not get the amber treatment — it is just progress.
    if (healthy) {
        return (
            <div
                role="status"
                className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm"
            >
                <CloudUpload size={16} className="flex-shrink-0 text-primary-text" />
                <p className="min-w-0 flex-1 text-foreground">
                    {pendingCount === 1
                        ? 'Syncing 1 change made offline.'
                        : `Syncing ${pendingCount} changes made offline.`}
                </p>
            </div>
        );
    }

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
                            {/* This used to say nothing would save. It does
                                now — writes are kept on this device and
                                replayed on reconnect. */}
                            Changes are saved on this device and will sync when
                            you reconnect.
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
            {pendingCount > 0 && (
                <span className="flex-shrink-0 rounded-lg bg-foreground/5 px-2.5 py-1 text-xs font-medium text-foreground">
                    {pendingCount === 1
                        ? '1 change waiting'
                        : `${pendingCount} changes waiting`}
                </span>
            )}
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
