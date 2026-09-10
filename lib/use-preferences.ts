'use client';

import { useSyncExternalStore } from 'react';
import {
    preferencesServerSnapshot,
    preferencesSnapshot,
    subscribePreferences,
    type Preferences,
} from '@/lib/preferences';

/**
 * Reads the current preferences.
 *
 * useSyncExternalStore rather than a context provider, matching
 * lib/use-online-status.ts and lib/offline-queue.ts: components that care
 * subscribe, and dragging a colour picker does not re-render the whole tree.
 */
export function usePreferences(): Preferences {
    return useSyncExternalStore(
        subscribePreferences,
        preferencesSnapshot,
        preferencesServerSnapshot,
    );
}
