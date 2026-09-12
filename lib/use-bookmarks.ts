'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bookmark, BookmarkFolder } from '@/lib/bookmark-types';
import { fetchBookmarkData } from '@/lib/bookmarks-api';

export type BookmarksStatus = 'loading' | 'ready' | 'error';

function byPosition<T extends { position: number; created_at: string }>(a: T, b: T) {
    return a.position - b.position || a.created_at.localeCompare(b.created_at);
}

function upsertRow<T extends { id: string }>(rows: T[], row: T): T[] {
    return rows.some((r) => r.id === row.id)
        ? rows.map((r) => (r.id === row.id ? row : r))
        : [...rows, row];
}

/**
 * Both bookmark tables, loaded once and then kept current over one realtime
 * channel. A save from the browser extension lands here without a refresh —
 * that is the whole reason the extension writes to Supabase directly.
 *
 * Only subscribes while `enabled`, so a closed drawer holds no channel open.
 */
export function useBookmarks(
    supabase: SupabaseClient,
    userId: string | null,
    enabled: boolean,
) {
    const [folders, setFolders] = useState<BookmarkFolder[]>([]);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [status, setStatus] = useState<BookmarksStatus>('loading');
    const [error, setError] = useState<string | null>(null);
    const [reloadNonce, setReloadNonce] = useState(0);

    useEffect(() => {
        if (!enabled || !userId) return;
        let cancelled = false;

        setStatus('loading');
        fetchBookmarkData(supabase).then((result) => {
            if (cancelled) return;
            if (result.error) {
                setError(result.error);
                setStatus('error');
                return;
            }
            setFolders(result.folders);
            setBookmarks(result.bookmarks);
            setError(null);
            setStatus('ready');
        });

        const channel = supabase
            .channel('bookmarks-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookmark_folders', filter: `user_id=eq.${userId}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        const id = payload.old.id as string;
                        setFolders((c) => c.filter((f) => f.id !== id));
                        // Mirror ON DELETE SET NULL locally; the UPDATE events
                        // for each bookmark arrive too, but this keeps the UI
                        // from flashing them as missing in between.
                        setBookmarks((c) =>
                            c.map((b) => (b.folder_id === id ? { ...b, folder_id: null } : b)),
                        );
                        return;
                    }
                    setFolders((c) => upsertRow(c, payload.new as BookmarkFolder));
                },
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bookmarks', filter: `user_id=eq.${userId}` },
                (payload) => {
                    if (payload.eventType === 'DELETE') {
                        const id = payload.old.id as string;
                        setBookmarks((c) => c.filter((b) => b.id !== id));
                        return;
                    }
                    setBookmarks((c) => upsertRow(c, payload.new as Bookmark));
                },
            )
            .subscribe();

        return () => {
            cancelled = true;
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, enabled, reloadNonce]);

    const sortedFolders = useMemo(() => [...folders].sort(byPosition), [folders]);
    const sortedBookmarks = useMemo(() => [...bookmarks].sort(byPosition), [bookmarks]);

    return {
        folders: sortedFolders,
        bookmarks: sortedBookmarks,
        status,
        error,
        reload: () => setReloadNonce((n) => n + 1),
    };
}
