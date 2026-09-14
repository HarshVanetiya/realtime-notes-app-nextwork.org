'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Bookmark } from './bookmark-types';

const STORAGE_KEY = 'prism:pinned-bookmarks';
const EVENT_NAME = 'pinned-bookmarks-changed';

export function getPinnedBookmarkIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function setPinnedBookmarkIds(ids: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
        window.dispatchEvent(new Event(EVENT_NAME));
    } catch {
        // storage full or disabled
    }
}

export function togglePinnedBookmark(id: string): boolean {
    const current = getPinnedBookmarkIds();
    const isCurrentlyPinned = current.includes(id);
    const next = isCurrentlyPinned ? current.filter((x) => x !== id) : [...current, id];
    setPinnedBookmarkIds(next);
    return !isCurrentlyPinned;
}

export function usePinnedBookmarks(allBookmarks: Bookmark[] = []) {
    const [pinnedIds, setPinnedIds] = useState<string[]>([]);

    useEffect(() => {
        setPinnedIds(getPinnedBookmarkIds());

        const onStorageOrCustom = () => {
            setPinnedIds(getPinnedBookmarkIds());
        };

        window.addEventListener(EVENT_NAME, onStorageOrCustom);
        window.addEventListener('storage', onStorageOrCustom);
        return () => {
            window.removeEventListener(EVENT_NAME, onStorageOrCustom);
            window.removeEventListener('storage', onStorageOrCustom);
        };
    }, []);

    const togglePin = useCallback((id: string) => {
        togglePinnedBookmark(id);
    }, []);

    const pin = useCallback((id: string) => {
        const current = getPinnedBookmarkIds();
        if (!current.includes(id)) {
            setPinnedBookmarkIds([...current, id]);
        }
    }, []);

    const unpin = useCallback((id: string) => {
        const current = getPinnedBookmarkIds();
        if (current.includes(id)) {
            setPinnedBookmarkIds(current.filter((x) => x !== id));
        }
    }, []);

    const isPinned = useCallback(
        (id: string) => {
            return pinnedIds.includes(id);
        },
        [pinnedIds]
    );

    // If user has explicitly pinned bookmarks, display them in order.
    // If not, fallback to up to the first 4 available bookmarks so the taskbar has quick access.
    const pinnedBookmarks = useMemo(() => {
        if (pinnedIds.length > 0) {
            const bookmarkMap = new Map(allBookmarks.map((b) => [b.id, b]));
            return pinnedIds.map((id) => bookmarkMap.get(id)).filter((b): b is Bookmark => Boolean(b));
        }
        return allBookmarks.slice(0, 4);
    }, [pinnedIds, allBookmarks]);

    return {
        pinnedIds,
        pinnedBookmarks,
        isPinned,
        togglePin,
        pin,
        unpin,
        hasExplicitPins: pinnedIds.length > 0,
    };
}
