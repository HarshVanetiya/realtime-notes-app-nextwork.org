import { createClient, type SupportedStorage } from '@supabase/supabase-js';

/**
 * Session storage backed by chrome.storage.local, so the popup and the
 * service worker — separate JS contexts — see the same sign-in, and it
 * survives the worker being suspended.
 */
const chromeStorage: SupportedStorage = {
    async getItem(key) {
        const result = await chrome.storage.local.get(key);
        const value = result[key];
        return typeof value === 'string' ? value : null;
    },
    async setItem(key, value) {
        await chrome.storage.local.set({ [key]: value });
    },
    async removeItem(key) {
        await chrome.storage.local.remove(key);
    },
};

export const supabase = createClient(__SUPABASE_URL__, __SUPABASE_KEY__, {
    auth: {
        storage: chromeStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
    },
});

/** The user id if a valid (or refreshable) session exists, else null. */
export async function currentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.user.id ?? null;
}

export function isBookmarkableUrl(url: string | undefined): url is string {
    return !!url && url.length <= 2048 && /^https?:\/\/\S+$/i.test(url);
}

export type SaveOutcome = 'saved' | 'exists' | 'invalid' | 'signed-out' | 'error';

export async function saveBookmark(input: {
    url: string | undefined;
    title?: string;
    faviconUrl?: string;
}): Promise<{ outcome: SaveOutcome; message?: string }> {
    if (!isBookmarkableUrl(input.url)) return { outcome: 'invalid' };

    const userId = await currentUserId();
    if (!userId) return { outcome: 'signed-out' };

    const title = (input.title ?? '').trim().slice(0, 200) || new URL(input.url).hostname;
    const favicon = isBookmarkableUrl(input.faviconUrl) ? input.faviconUrl : null;

    // Unique on (user_id, url): a duplicate is skipped and comes back as an
    // empty result rather than an error.
    const { data, error } = await supabase
        .from('bookmarks')
        .upsert(
            { user_id: userId, url: input.url, title, favicon_url: favicon },
            { onConflict: 'user_id,url', ignoreDuplicates: true },
        )
        .select('id');

    if (error) {
        // 42501 = RLS refused: the session is stale or belongs to nobody.
        if (error.code === '42501' || error.code === 'PGRST301') return { outcome: 'signed-out' };
        return { outcome: 'error', message: error.message };
    }
    return { outcome: data && data.length > 0 ? 'saved' : 'exists' };
}
