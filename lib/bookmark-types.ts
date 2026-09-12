export type BookmarkFolder = {
    id: string;
    user_id: string;
    name: string;
    position: number;
    created_at: string;
    updated_at: string;
};

export type Bookmark = {
    id: string;
    user_id: string;
    folder_id: string | null;
    title: string;
    url: string;
    favicon_url: string | null;
    position: number;
    created_at: string;
    updated_at: string;
};

export const FOLDER_NAME_MAX = 60;
export const BOOKMARK_TITLE_MAX = 200;
export const BOOKMARK_URL_MAX = 2048;

/** Mirrors the `bookmarks_url_shape` check so the form can refuse early. */
export function isBookmarkableUrl(url: string): boolean {
    if (url.length > BOOKMARK_URL_MAX) return false;
    return /^https?:\/\/\S+$/i.test(url);
}

export function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

/**
 * Where a tile's icon comes from, in order: what the extension captured, then
 * Google's favicon service for the host, then nothing (the tile draws a letter).
 */
export function faviconFor(bookmark: Pick<Bookmark, 'url' | 'favicon_url'>): string | null {
    if (bookmark.favicon_url) return bookmark.favicon_url;
    try {
        const host = new URL(bookmark.url).hostname;
        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
    } catch {
        return null;
    }
}
