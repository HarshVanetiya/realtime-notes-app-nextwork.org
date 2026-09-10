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
/** A ceiling on cards per row, or 'auto' to fill the available width. */
export type Columns = 'auto' | 2 | 3 | 4 | 5 | 6;

export const COLUMN_CHOICES: Columns[] = ['auto', 2, 3, 4, 5, 6];

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
    /** Independent of density: density sets how BIG a card is, this sets how
     *  many of them are allowed across before the row wraps. */
    columns: Columns;
    previewLines: number;
    showTags: boolean;
    showDate: boolean;
    tags: Record<string, TagMeta>;
};

/**
 * A calm desaturated blue — hsl(212 72% 48%), the value the default tokens in
 * app/globals.css were measured against. White on it is 4.61:1.
 *
 * It is written here as the hex the derivation consumes, and the CSS tokens
 * are that derivation's output, so the server-rendered first frame of a fresh
 * account is byte-identical to what the client computes on hydration. It was
 * previously #2b7fd4, a visibly lighter blue on which white text is 4.14:1 —
 * so the derivation picked BLACK for the button label while the stylesheet
 * said white. scripts/check-accent-contrast.mjs now asserts the two agree.
 */
export const DEFAULT_ACCENT = '#2275d3';

export const DEFAULT_PALETTE = [
    '#2275d3', // blue
    '#12a594', // teal
    '#3e9b4f', // green
    '#c2820a', // amber
    '#d1544f', // red
    '#a259c9', // violet
    '#d6549a', // pink
    '#6b7280', // slate
];

export const ACCENT_PRESETS = [
    { name: 'Blue', value: '#2275d3' },
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
    columns: 'auto',
    previewLines: 8,
    showTags: true,
    showDate: true,
    tags: {},
};

/**
 * How big a card is at each size setting — its shape, and its natural width.
 *
 * Density no longer decides how many fit across; `columns` does. That split is
 * the point: a small card and three per row is a legitimate combination, and
 * welding the two together made it unreachable.
 *
 * `cardWidth` is the width a card wants. The grid hands out at least this much
 * to every column, so the same setting drives both the fixed-column max-width
 * and, in `auto`, how many columns fit. Values are the widths these densities
 * were already rendering at (compact was landing at 252px, large at 430px), so
 * nothing visibly resizes for someone who never touches the new control.
 *
 * `previewLines` is a CEILING, not a target: the body fills whatever height the
 * tile gives it and fades out at the bottom. The number only stops a very long
 * note from rendering hundreds of clipped lines the browser then has to lay
 * out and immediately hide.
 */
export const DENSITY: Record<
    Density,
    { ratio: string; cardWidth: number; previewLines: number }
> = {
    compact: { ratio: '5 / 6', cardWidth: 240, previewLines: 4 },
    comfortable: { ratio: '4 / 5', cardWidth: 320, previewLines: 8 },
    large: { ratio: '3 / 4', cardWidth: 420, previewLines: 12 },
};

/** The grid's gutter, in px. Matches `gap-4` on the grid in NotesList. */
export const GRID_GAP = 16;

/** Width of the whole grid when `columns` is 'auto' — a wide monitor's worth of
 *  cards, past which they stretched into letterboxes. */
export const AUTO_MAX_WIDTH = 1360;

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

/**
 * `columns` is the one numeric enum here, and it reaches CSS as a repeat()
 * count — so anything that is not literally 'auto' or a whole number in range
 * falls back rather than being coerced. A string '3' from an older blob is
 * accepted; '3; }' is not.
 */
function safeColumns(v: unknown): Columns {
    if (v === 'auto') return 'auto';
    const n = typeof v === 'number' || typeof v === 'string' ? Number(v) : NaN;
    return Number.isInteger(n) && n >= 2 && n <= 6 ? (n as Columns) : 'auto';
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
        columns: safeColumns(o.columns),
        previewLines: Number.isFinite(lines) ? Math.min(12, Math.max(0, Math.round(lines))) : DEFAULTS.previewLines,
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

/**
 * The two colours a tag chip needs, derived from its one palette colour.
 *
 * The palette holds FILL-grade colours — right for a swatch, wrong for 11px
 * text, which is the same distinction `--primary` and `--primary-text` exist
 * to draw for the accent. Chips were painting the raw value as their label on
 * a 10%-alpha wash of itself, and axe found all twelve at once: nowhere near
 * 4.5:1.
 *
 * So the chip is a SOLID fill of the tag's colour with black or white on top,
 * whichever is readable — the `accentForeground` derivation, which depends
 * only on the fill. That matters: a text step would have to be walked against
 * the page background, and the components rendering chips do not know the
 * theme at render time (next-themes resolves it after hydration, so every chip
 * would change colour on load). This version needs no theme at all, and
 * scripts/check-accent-contrast.mjs already sweeps 3,888 colours proving the
 * derived foreground clears AA on every one of them.
 */
export function tagChipColors(
    tag: string,
    prefs: Preferences,
): { color: string; backgroundColor: string; borderColor: string } {
    const raw = tagColor(tag, prefs);
    const steps = deriveAccentSteps(raw, 'light'); // accentForeground ignores the theme
    const fg = steps
        ? `hsl(${steps.accentForeground.h} ${steps.accentForeground.s}% ${steps.accentForeground.l}%)`
        : '#fff';
    return { color: fg, backgroundColor: raw, borderColor: raw };
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

/**
 * The three numbers the grid is built from, as custom properties.
 *
 * They live on <html> rather than in the component because they have to be
 * right in the FIRST painted frame — the same reason the accent does. The
 * pre-paint script previously wrote `dataset.layout` and `dataset.density`
 * instead, which nothing read: the grid was server-rendered at the default
 * density and snapped to the real one on hydration.
 *
 * `--grid-max-w` is the whole trick. Capping the container at exactly N cards'
 * worth means `repeat(auto-fill, ...)` can never lay out more than N columns,
 * and lays out fewer on its own when the viewport is narrower — one rule gives
 * both the ceiling and the responsiveness, with no breakpoints to maintain.
 */
export function gridVars(prefs: Preferences): CssVars {
    const { cardWidth, ratio } = DENSITY[prefs.density];
    // A list is one note per row, so a cards-per-row ceiling means nothing
    // there — narrowing the page to three cards' width would just squeeze the
    // rows for no reason.
    const n = prefs.layout === 'grid' ? prefs.columns : 'auto';
    const maxWidth =
        n === 'auto' ? AUTO_MAX_WIDTH : n * cardWidth + (n - 1) * GRID_GAP;
    return {
        '--card-w': `${cardWidth}px`,
        '--grid-max-w': `${maxWidth}px`,
        '--tile-ratio': ratio,
    };
}

export type Mirror = {
    theme: Theme;
    layout: LayoutMode;
    density: Density;
    columns: Columns;
    vars: Record<'light' | 'dark', CssVars>;
    grid: CssVars;
};

export function toMirror(prefs: Preferences): Mirror {
    return {
        theme: prefs.theme,
        layout: prefs.layout,
        density: prefs.density,
        columns: prefs.columns,
        vars: accentVars(prefs.accent),
        grid: gridVars(prefs),
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
    for (const [k, v] of Object.entries(gridVars(prefs))) el.style.setProperty(k, v);
    el.dataset.layout = prefs.layout;
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
