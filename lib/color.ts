/**
 * Colour maths for the user-chosen accent.
 *
 * The whole "pick any colour you like" feature rests on one guarantee: whatever
 * hex someone types, text stays readable. That cannot be hand-measured the way
 * the original indigo palette was — there is no palette any more, only whatever
 * the user picked at 2am. So it is derived, and the derivation is swept across
 * the hue circle by scripts/check-accent-contrast.mjs rather than spot-checked.
 *
 * Deliberately dependency-free and free of DOM access: the same functions run
 * in the pre-paint inline script, in React, and in the node test.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

/* ------------------------------------------------------------------ *
 * The page backgrounds
 *
 * Hard-coded here AND in app/globals.css. That duplication is a real drift
 * risk, so scripts/check-accent-contrast.mjs parses the CSS and asserts the two
 * agree — a derivation measured against the wrong background would produce
 * confidently wrong contrast numbers, which is worse than none.
 * ------------------------------------------------------------------ */

export const BACKGROUND: Record<'light' | 'dark', Hsl> = {
    light: { h: 30, s: 8, l: 97 },
    dark: { h: 220, s: 6, l: 12 },
};

/* ------------------------------------------------------------------ *
 * Parsing
 * ------------------------------------------------------------------ */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Accepts `#abc`, `#aabbcc`, `rgb(1,2,3)`, `1 2 3` and bare `aabbcc`. */
export function parseColor(input: string): Rgb | null {
    const raw = input.trim().toLowerCase();
    if (!raw) return null;

    const hex = raw.startsWith('#') ? raw.slice(1) : raw;
    if (/^[0-9a-f]{3}$/.test(hex)) {
        return {
            r: parseInt(hex[0] + hex[0], 16),
            g: parseInt(hex[1] + hex[1], 16),
            b: parseInt(hex[2] + hex[2], 16),
        };
    }
    if (/^[0-9a-f]{6}$/.test(hex)) {
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
        };
    }

    const nums = raw.match(/-?\d+(\.\d+)?/g);
    if (raw.startsWith('rgb') && nums && nums.length >= 3) {
        return {
            r: clamp(Math.round(+nums[0]), 0, 255),
            g: clamp(Math.round(+nums[1]), 0, 255),
            b: clamp(Math.round(+nums[2]), 0, 255),
        };
    }
    if (!raw.startsWith('rgb') && nums && nums.length === 3) {
        return {
            r: clamp(Math.round(+nums[0]), 0, 255),
            g: clamp(Math.round(+nums[1]), 0, 255),
            b: clamp(Math.round(+nums[2]), 0, 255),
        };
    }
    return null;
}

export function rgbToHex({ r, g, b }: Rgb): string {
    const part = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
    return `#${part(r)}${part(g)}${part(b)}`;
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    const [r1, g1, b1] =
        hp < 1 ? [c, x, 0]
        : hp < 2 ? [x, c, 0]
        : hp < 3 ? [0, c, x]
        : hp < 4 ? [0, x, c]
        : hp < 5 ? [x, 0, c]
        : [c, 0, x];
    const m = ln - c / 2;
    return {
        r: Math.round((r1 + m) * 255),
        g: Math.round((g1 + m) * 255),
        b: Math.round((b1 + m) * 255),
    };
}

/* ------------------------------------------------------------------ *
 * Contrast (WCAG 2.1)
 * ------------------------------------------------------------------ */

function channel(v: number): number {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(rgb: Rgb): number {
    return (
        0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
    );
}

export function contrastRatio(a: Rgb, b: Rgb): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
}

/** WCAG AA for normal-size text. */
export const AA_NORMAL = 4.5;

/* ------------------------------------------------------------------ *
 * Derivation
 * ------------------------------------------------------------------ */

export type AccentSteps = {
    /** The user's colour, untouched. Every filled surface uses exactly this. */
    accent: Hsl;
    /** Black or white — whichever is readable ON the fill. */
    accentForeground: Hsl;
    /** Same hue, lightness walked until it clears AA on the page background. */
    accentText: Hsl;
    /** What the caller can show the user about their choice. */
    report: {
        onFill: number;
        onBackground: number;
        /** True when the raw colour would have failed as text and was stepped. */
        adjusted: boolean;
    };
};

const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const BLACK: Rgb = { r: 0, g: 0, b: 0 };

/**
 * Turns one colour into the three the interface needs.
 *
 * `accentText` walks lightness away from the background one percent at a time.
 * It always converges: pushed far enough it becomes black or white, and both
 * clear AA against either background comfortably. Saturation is held so the
 * text still reads as the user's hue rather than as grey.
 */
export function deriveAccentSteps(
    input: string | Rgb,
    theme: 'light' | 'dark',
): AccentSteps | null {
    const rgb = typeof input === 'string' ? parseColor(input) : input;
    if (!rgb) return null;

    const accent = rgbToHsl(rgb);
    const bgRgb = hslToRgb(BACKGROUND[theme]);

    const onWhite = contrastRatio(rgb, WHITE);
    const onBlack = contrastRatio(rgb, BLACK);
    const accentForeground: Hsl =
        onWhite >= onBlack ? { h: 0, s: 0, l: 100 } : { h: 0, s: 0, l: 0 };

    // Light background -> darken the text; dark background -> lighten it.
    const step = theme === 'light' ? -1 : 1;
    let l = accent.l;
    let best = { ...accent };
    let ratio = contrastRatio(rgb, bgRgb);
    const startedBelow = ratio < AA_NORMAL;

    while (ratio < AA_NORMAL && l >= 0 && l <= 100) {
        l += step;
        const candidate = { h: accent.h, s: accent.s, l: clamp(l, 0, 100) };
        ratio = contrastRatio(hslToRgb(candidate), bgRgb);
        best = candidate;
    }

    return {
        accent,
        accentForeground,
        accentText: best,
        report: {
            onFill: Math.max(onWhite, onBlack),
            onBackground: ratio,
            adjusted: startedBelow,
        },
    };
}

/** `H S% L%` — the space-separated form every token in globals.css uses. */
export function hslToken({ h, s, l }: Hsl): string {
    return `${h.toFixed(1)} ${s.toFixed(1)}% ${l.toFixed(1)}%`;
}
