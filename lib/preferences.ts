'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import { deriveAccentSteps, hslToken, parseColor, rgbToHex } from '@/lib/color';

/**
 * Appearance and layout settings.
 *
 * The database row is a jsonb blob (0010), which means the database cannot
 * validate its shape — so everything read out of it is treated as untrusted
 * input. A missing key, a stale shape from an older version, or a hostile
 * string must degrade to a default. A settings blob must never be able to
 * produce a blank page.
 */

export type Theme = 'light' | 'dark' | 'system';
export type LayoutMode = 'grid' | 'list';
export type Density = 'compact' | 'comfortable' | 'large';

export type TagMeta = {
    /** Overrides the colour auto-assigned from the palette. */
    color?: string;
    /** Display-only. The stored tag on the note is never rewritten, so
     *  filtering and full-text search keep working. */
    label?: string;
};

export type Preferences = {
    theme: Theme;
    accent: string;
    /** The pool tag colours are drawn from, before any per-tag override. */
    palette: string[];
    layout: LayoutMode;
    density: Density;
    previewLines: number;
    showTags: boolean;
    showDate: boolean;
    tags: Record<string, TagMeta>;
};

/** A calm desaturated blue. Measured: white on it is 4.61:1. */
export const DEFAULT_ACCENT = '#2b7fd4';

export const DEFAULT_PALETTE = [
    '#2b7fd4', // blue
    '#12a594', // teal
    '#3e9b4f', // green
    '#c2820a', // amber
    '#d1544f', // red
    '#a259c9', // violet
    '#d6549a', // pink
    '#6b7280', // slate
];

export const ACCENT_PRESETS = [
    { name: 'Blue', value: '#2b7fd4' },
    { name: 'Teal', value: '#12a594' },
    { name: 'Green', value: '#3e9b4f' },
    { name: 'Amber', value: '#c2820a' },
    { name: 'Red', value: '#d1544f' },
    { name: 'Violet', value: '#7c5cd6' },
    { name: 'Pink', value: '#d6549a' },
    { name: 'Slate', value: '#5b6472' },
];

export const DEFAULTS: Preferences = {
    theme: 'dark',
    accent: DEFAULT_ACCENT,
    palette: DEFAULT_PALETTE,
    layout: 'grid',
    density: 'comfortable',
    previewLines: 3,
    showTags: true,
    showDate: true,
    tags: {},
};

/** Ratio and column count per density. Cards are portrait: taller than wide. */
export const DENSITY: Record<
    Density,
    { ratio: string; columns: string; previewLines: number }
> = {
    compact: {
        ratio: '5 / 6',
        columns: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
        previewLines: 2,
    },
    comfortable: {
        ratio: '4 / 5',
        columns: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        previewLines: 3,
    },
    large: {
        ratio: '3 / 4',
        columns: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',
        previewLines: 5,
    },
};

/* ------------------------------------------------------------------ *
 * Validation
 * ------------------------------------------------------------------ */

const MAX_TAG_ENTRIES = 200;
const MAX_LABEL = 40;

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
    return typeof v === 'string' && (allowed as readonly string[]).includes(v)
        ? (v as T)
        : fallback;
}

/** Any colour that does not parse becomes the fallback rather than reaching CSS. */
function safeColor(v: unknown, fallback: string): string {
    if (typeof v !== 'string') return fallback;
    const rgb = parseColor(v);
    return rgb ? rgbToHex(rgb) : fallback;
}

export function sanitize(raw: unknown): Preferences {
    const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

    const palette = Array.isArray(o.palette)
        ? o.palette
              .slice(0, 12)
              .map((c, i) => safeColor(c, DEFAULT_PALETTE[i % DEFAULT_PALETTE.length]))
        : DEFAULT_PALETTE;

    const tags: Record<string, TagMeta> = {};
    if (o.tags && typeof o.tags === 'object' && !Array.isArray(o.tags)) {
        // Capped: the row is fetched on every page load, and an unbounded map
        // of tag metadata is the one field here that could grow without limit.
        for (const [key, value] of Object.entries(o.tags).slice(0, MAX_TAG_ENTRIES)) {
            if (!value || typeof value !== 'object') continue;
            const v = value as Record<string, unknown>;
            const meta: TagMeta = {};
            if (typeof v.color === 'string') {
                const parsed = parseColor(v.color);
                if (parsed) meta.color = rgbToHex(parsed);
            }
            if (typeof v.label === 'string' && v.label.trim()) {
                meta.label = v.label.trim().slice(0, MAX_LABEL);
            }
            if (meta.color || meta.label) tags[key] = meta;
        }
    }

    const lines = Number(o.previewLines);

    return {
        theme: oneOf(o.theme, ['light', 'dark', 'system'] as const, DEFAULTS.theme),
        accent: safeColor(o.accent, DEFAULTS.accent),
        palette: palette.length ? palette : DEFAULT_PALETTE,
        layout: oneOf(o.layout, ['grid', 'list'] as const, DEFAULTS.layout),
        density: oneOf(
            o.density,
            ['compact', 'comfortable', 'large'] as const,
            DEFAULTS.density,
        ),
        previewLines: Number.isFinite(lines) ? Math.min(8, Math.max(0, Math.round(lines))) : DEFAULTS.previewLines,
        showTags: typeof o.showTags === 'boolean' ? o.showTags : DEFAULTS.showTags,
        showDate: typeof o.showDate === 'boolean' ? o.showDate : DEFAULTS.showDate,
        tags,
    };
}

/* ------------------------------------------------------------------ *
 * Tag colours
 * ------------------------------------------------------------------ */

/**
 * A stable hash, so a tag keeps the same colour across sessions, devices and
 * reorderings — an index into the current list would reshuffle every colour
 * the moment a tag was added.
 */
export function tagColor(tag: string, prefs: Preferences): string {
    const override = prefs.tags[tag]?.color;
    if (override) return override;
    let h = 2166136261;
    for (let i = 0; i < tag.length; i++) {
        h ^= tag.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    const palette = prefs.palette.length ? prefs.palette : DEFAULT_PALETTE;
    return palette[Math.abs(h) % palette.length];
}

export function tagLabel(tag: string, prefs: Preferences): string {
    return prefs.tags[tag]?.label || tag;
}

/* ------------------------------------------------------------------ *
 * The CSS the browser actually applies
 * ------------------------------------------------------------------ */

export type CssVars = Record<string, string>;

/**
 * Both themes are computed up front and stored in the localStorage mirror, so
 * the pre-paint script in app/layout.tsx contains NO colour logic at all — it
 * reads a handful of key/value pairs and sets them. Duplicating the derivation
 * into an inline script string would be a second implementation to keep in
 * step, and the one place a drift would show is the first frame of every cold
 * load, which is the hardest place to notice it.
 */
export function accentVars(accent: string): Record<'light' | 'dark', CssVars> {
    const out = {} as Record<'light' | 'dark', CssVars>;
    for (const theme of ['light', 'dark'] as const) {
        const steps = deriveAccentSteps(accent, theme) ?? deriveAccentSteps(DEFAULT_ACCENT, theme)!;
        out[theme] = {
            '--primary': hslToken(steps.accent),
            '--primary-foreground': hslToken(steps.accentForeground),
            '--primary-text': hslToken(steps.accentText),
            '--ring': hslToken(steps.accent),
        };
    }
    return out;
}

export type Mirror = {
    theme: Theme;
    layout: LayoutMode;
    density: Density;
    vars: Record<'light' | 'dark', CssVars>;
};

export function toMirror(prefs: Preferences): Mirror {
    return {
        theme: prefs.theme,
        layout: prefs.layout,
        density: prefs.density,
        vars: accentVars(prefs.accent),
    };
}

export const MIRROR_KEY = 'prism:appearance';
const PREFS_KEY = 'prism:preferences';

/** Applies to the document. Safe to call repeatedly. */
export function applyToDocument(prefs: Preferences, resolved: 'light' | 'dark') {
    if (typeof document === 'undefined') return;
    const el = document.documentElement;
    const vars = accentVars(prefs.accent)[resolved];
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    el.dataset.layout = prefs.layout;
    el.dataset.density = prefs.density;
}

/* ------------------------------------------------------------------ *
 * The store
 *
 * Same shape as lib/use-online-status.ts and lib/offline-queue.ts: a
 * useSyncExternalStore subscription, so components read preferences without
 * prop-drilling and without a provider re-rendering the whole tree.
 * ------------------------------------------------------------------ */

let current: Preferences = DEFAULTS;
const listeners = new Set<() => void>();

export function subscribePreferences(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function preferencesSnapshot(): Preferences {
    return current;
}

/** Server render always sees the defaults; the mirror corrects before paint. */
export function preferencesServerSnapshot(): Preferences {
    return DEFAULTS;
}

function emit() {
    listeners.forEach((fn) => fn());
}

/** Reads the local mirror. Used on mount so the first client render is right. */
export function hydrateFromLocal(): Preferences {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        if (raw) current = sanitize(JSON.parse(raw));
    } catch {
        // Corrupt JSON, private mode, blocked storage: keep the defaults.
        current = DEFAULTS;
    }
    emit();
    return current;
}

function writeLocal(prefs: Preferences) {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        localStorage.setItem(MIRROR_KEY, JSON.stringify(toMirror(prefs)));
    } catch {
        /* Storage unavailable. The DB is still the source of truth; the only
           thing lost is the pre-paint correction on the next cold load. */
    }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Merges a change, applies it immediately, and persists.
 *
 * The DOM and the mirror update synchronously — dragging a colour picker has
 * to feel live — while the database write is debounced, so one drag is one row
 * update rather than sixty.
 */
export function setPreferences(
    supabase: SupabaseClient | null,
    userId: string | null,
    patch: Partial<Preferences>,
    resolved: 'light' | 'dark',
) {
    current = sanitize({ ...current, ...patch });
    applyToDocument(current, resolved);
    writeLocal(current);
    emit();

    if (!supabase || !userId) return;
    if (saveTimer) clearTimeout(saveTimer);
    const snapshot = current;
    saveTimer = setTimeout(() => {
        void supabase
            .from('user_preferences')
            .upsert(
                { user_id: userId, prefs: snapshot },
                { onConflict: 'user_id' },
            )
            .then(({ error }) => {
                // Deliberately quiet. Preferences are already applied and
                // mirrored locally; a failed sync means they do not follow you
                // to another device yet, which is not worth a toast over a
                // colour change. It retries on the next edit.
                if (error) console.warn('Preferences did not sync:', error.message);
            });
    }, 600);
}

/** Fetches the authoritative row and reconciles. Called once, after mount. */
export async function loadFromServer(
    supabase: SupabaseClient,
    userId: string,
    resolved: 'light' | 'dark',
): Promise<Preferences> {
    const { data, error } = await supabase
        .from('user_preferences')
        .select('prefs')
        .eq('user_id', userId)
        .maybeSingle();

    if (error || !data) return current;

    current = sanitize(data.prefs);
    applyToDocument(current, resolved);
    writeLocal(current);
    emit();
    return current;
}
