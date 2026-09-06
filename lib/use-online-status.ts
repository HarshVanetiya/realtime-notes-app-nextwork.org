'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Tracks browser connectivity. Same shape as lib/use-media-query.ts: a
 * useSyncExternalStore subscription with an optimistic server snapshot, so the
 * markup matches on both sides and the real value arrives after hydration.
 */
export function useOnlineStatus(): boolean {
    const subscribe = useCallback((onChange: () => void) => {
        window.addEventListener('online', onChange);
        window.addEventListener('offline', onChange);
        return () => {
            window.removeEventListener('online', onChange);
            window.removeEventListener('offline', onChange);
        };
    }, []);

    return useSyncExternalStore(
        subscribe,
        () => navigator.onLine,
        () => true,
    );
}
