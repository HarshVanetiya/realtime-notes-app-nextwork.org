'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import {
    applyToDocument,
    hydrateFromLocal,
    loadFromServer,
    preferencesSnapshot,
} from '@/lib/preferences';

/**
 * Reconciles the three places preferences live: the local mirror (fast, may be
 * stale), the database (authoritative, one round trip away), and the document.
 *
 * Mounted once in the app shell. Renders nothing.
 *
 * Order matters. The mirror is read synchronously on mount so the first client
 * render already matches what the pre-paint script drew; the server row lands a
 * moment later and wins if it differs — which is what makes a change made on
 * your phone show up here.
 */
export default function PreferencesSync({ userId }: { userId: string | null }) {
    const { resolvedTheme, setTheme } = useTheme();
    const theme = resolvedTheme === 'light' ? 'light' : 'dark';

    useEffect(() => {
        const prefs = hydrateFromLocal();
        applyToDocument(prefs, theme);
        // next-themes keeps the light/dark class on <html> from its OWN
        // localStorage key; our row only mirrors the choice. On this device the
        // two already agree, so this matters when they have drifted — and it is
        // the same call the server load below needs, so it is written once.
        setTheme(prefs.theme);
        // Only on mount: later re-applies are handled by the theme effect below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        const supabase = createClient();
        void loadFromServer(supabase, userId, theme)
            .then((prefs) => {
                // The row is authoritative. Without this the theme was the one
                // preference that did NOT follow you to another device: it was
                // written to the row and read back into the store, but the
                // class on <html> is next-themes' to set, and nothing told it.
                if (!cancelled) setTheme(prefs.theme);
            })
            .catch(() => {
                // Offline, or the table is not there yet. The local mirror is
                // already applied, so there is nothing to fall back to and
                // nothing worth interrupting the user about.
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    // The accent's readable text step is derived per theme, so flipping
    // light/dark has to recompute it — not just swap the background.
    useEffect(() => {
        applyToDocument(preferencesSnapshot(), theme);
    }, [theme]);

    return null;
}
