import { currentUserId, saveBookmark, supabase, type SaveOutcome } from './supabase';

const LINK_MENU_ID = 'prism-bookmark-link';
const SIGN_OUT_MENU_ID = 'prism-sign-out';

/**
 * The toolbar button has two jobs. Signed out, it opens the popup (sign-in).
 * Signed in, it saves the current tab with no popup at all. Chrome decides
 * which by whether a popup is set, so the popup is toggled on and off as the
 * session comes and goes.
 */
async function syncActionMode(): Promise<void> {
    const signedIn = (await currentUserId()) !== null;
    await chrome.action.setPopup({ popup: signedIn ? '' : 'popup.html' });
    await chrome.action.setTitle({
        title: signedIn ? 'Save this page to Prism bookmarks' : 'Sign in to Prism bookmarks',
    });
    await chrome.contextMenus.update(SIGN_OUT_MENU_ID, { visible: signedIn }).catch(() => {});
}

const BADGES: Record<SaveOutcome, { text: string; color: string; title: string }> = {
    saved: { text: '✓', color: '#16a34a', title: 'Saved to Prism bookmarks' },
    exists: { text: '=', color: '#6366f1', title: 'Already in your bookmarks' },
    invalid: { text: '!', color: '#d97706', title: 'Only http(s) pages can be bookmarked' },
    'signed-out': { text: '!', color: '#dc2626', title: 'Sign in to save bookmarks' },
    error: { text: '!', color: '#dc2626', title: 'Could not save' },
};

let badgeTimer: ReturnType<typeof setTimeout> | null = null;

async function flashBadge(outcome: SaveOutcome, tabId?: number): Promise<void> {
    const b = BADGES[outcome];
    const target = tabId !== undefined ? { tabId } : {};
    await chrome.action.setBadgeBackgroundColor({ ...target, color: b.color });
    await chrome.action.setBadgeTextColor?.({ ...target, color: '#ffffff' }).catch(() => {});
    await chrome.action.setBadgeText({ ...target, text: b.text });
    await chrome.action.setTitle({ ...target, title: b.title });
    if (badgeTimer) clearTimeout(badgeTimer);
    badgeTimer = setTimeout(async () => {
        await chrome.action.setBadgeText({ ...target, text: '' });
        await syncActionMode();
    }, 2000);
}

async function saveAndReport(
    input: { url: string | undefined; title?: string; faviconUrl?: string },
    tabId?: number,
): Promise<void> {
    const result = await saveBookmark(input);
    await flashBadge(result.outcome, tabId);
    if (result.outcome === 'signed-out') {
        await chrome.action.setPopup({ popup: 'popup.html' });
        // openPopup is only permitted from a user gesture, which this is.
        await chrome.action.openPopup?.().catch(() => {});
    }
}

chrome.action.onClicked.addListener((tab) => {
    void saveAndReport({ url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl }, tab.id);
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === LINK_MENU_ID && info.linkUrl) {
        // Chrome does not expose the link's text; the hostname and path are
        // the best title available without injecting a script.
        let title = info.selectionText?.trim();
        if (!title) {
            try {
                const u = new URL(info.linkUrl);
                title = (u.hostname + u.pathname).replace(/^www\./, '').replace(/\/$/, '');
            } catch {
                title = info.linkUrl;
            }
        }
        void saveAndReport({ url: info.linkUrl, title }, tab?.id);
        return;
    }
    if (info.menuItemId === SIGN_OUT_MENU_ID) {
        void supabase.auth.signOut().then(syncActionMode);
    }
});

function installMenus(): void {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: LINK_MENU_ID,
            title: 'Bookmark this link in Prism',
            contexts: ['link'],
        });
        chrome.contextMenus.create({
            id: SIGN_OUT_MENU_ID,
            title: 'Sign out of Prism bookmarks',
            contexts: ['action'],
            visible: false,
        });
        void syncActionMode();
    });
}

chrome.runtime.onInstalled.addListener(installMenus);
chrome.runtime.onStartup.addListener(() => void syncActionMode());

// The popup tells us when the session changes.
chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message?.type === 'auth-changed') {
        void syncActionMode().then(() => sendResponse({ ok: true }));
        return true;
    }
    if (message?.type === 'save-current-tab') {
        chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            void saveAndReport({ url: tab?.url, title: tab?.title, faviconUrl: tab?.favIconUrl }, tab?.id)
                .then(() => sendResponse({ ok: true }));
        });
        return true;
    }
    return false;
});

// Worker may have been woken by a click with no earlier lifecycle event.
void syncActionMode();
