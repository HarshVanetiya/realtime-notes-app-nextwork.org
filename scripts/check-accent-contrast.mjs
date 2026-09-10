#!/usr/bin/env node
/**
 * Sweeps the accent derivation across the whole hue circle.
 *
 * The old palette was a handful of hand-measured indigo values, checked once.
 * Letting anyone type a hex removes that safety entirely: the derivation has to
 * hold for every colour a person might pick, including the awkward ones —
 * saturated yellow, near-black navy, pastel mint. Spot-checking three colours I
 * happen to think of would prove nothing.
 *
 * So: every hue at several saturations and lightnesses, in both themes,
 * asserting
 *
 *   - accentForeground clears AA on the fill    (text ON a filled button)
 *   - accentText clears AA on the background    (accent-coloured body text)
 *   - the untouched accent is preserved exactly (we never silently repaint
 *     the colour someone chose)
 *
 * Also cross-checks that the background constants in lib/color.ts still match
 * the ones in app/globals.css. A derivation measured against the wrong
 * background produces confidently wrong numbers, which is worse than none.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');

// lib/color.ts is TypeScript with no runtime-only syntax beyond types, so it is
// stripped rather than compiled — keeps this script dependency-free.
const { default: ts } = await import('typescript');
const src = readFileSync(join(ROOT, 'lib', 'color.ts'), 'utf8');
const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const mod = await import(
    'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
);

const {
    BACKGROUND,
    deriveAccentSteps,
    hslToRgb,
    contrastRatio,
    rgbToHex,
    AA_NORMAL,
    accentTextSurfaces,
    worstOnSurfaces,
} = mod;

/* DEFAULT_ACCENT lives in lib/preferences.ts, which is a 'use client' module
   using the @/ path alias — importing it here would mean resolving that alias.
   The literal is read straight out of the source instead, which also means
   this checks the constant the app actually ships. */
const prefsSrc = readFileSync(join(ROOT, 'lib', 'preferences.ts'), 'utf8');
const accentMatch = prefsSrc.match(/export const DEFAULT_ACCENT\s*=\s*'(#[0-9a-fA-F]{3,8})'/);
if (!accentMatch) {
    console.error('  FAIL  could not read DEFAULT_ACCENT from lib/preferences.ts');
    process.exit(1);
}
const DEFAULT_ACCENT = accentMatch[1];

let failures = 0;
const fail = (msg) => {
    if (failures < 25) console.error(`  FAIL  ${msg}`);
    failures++;
};

/* ---- 1. The constants must match the stylesheet ---- */
{
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    for (const [theme, hsl] of Object.entries(BACKGROUND)) {
        // Looks for `--background: H S% L%;` inside the right block.
        const block =
            theme === 'dark'
                ? css.slice(css.indexOf('.dark {'))
                : css.slice(css.indexOf(':root {'));
        const m = block.match(/--background:\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
        if (!m) {
            fail(`could not find --background for ${theme} in app/globals.css`);
            continue;
        }
        const [h, s, l] = [+m[1], +m[2], +m[3]];
        if (h !== hsl.h || s !== hsl.s || l !== hsl.l) {
            fail(
                `BACKGROUND.${theme} in lib/color.ts is ${hsl.h} ${hsl.s}% ${hsl.l}% ` +
                    `but globals.css says ${h} ${s}% ${l}% — the derivation would be ` +
                    `measured against a background that is not on screen`,
            );
        }
    }
}

/* ---- 1b. The hand-written defaults in the CSS must clear AA too ----
   The sweep proves the DERIVATION is sound. The default accent shipped in
   globals.css is not derived — it is typed by hand, so it needs checking on its
   own terms or a fresh account gets whatever was eyeballed. */
{
    const css = readFileSync(join(ROOT, 'app', 'globals.css'), 'utf8');
    const grab = (block, name) => {
        const m = block.match(new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`));
        return m ? { h: +m[1], s: +m[2], l: +m[3] } : null;
    };
    for (const theme of ['light', 'dark']) {
        const block =
            theme === 'dark'
                ? css.slice(css.indexOf('.dark {'))
                : css.slice(css.indexOf(':root {'), css.indexOf('.dark {'));
        const primary = grab(block, 'primary');
        const fg = grab(block, 'primary-foreground');
        const text = grab(block, 'primary-text');
        const bg = grab(block, 'background');
        if (!primary || !fg || !text || !bg) {
            fail(`could not read the default accent tokens for ${theme}`);
            continue;
        }
        const onFill = contrastRatio(hslToRgb(fg), hslToRgb(primary));
        const onBg = worstOnSurfaces(
            hslToRgb(text),
            accentTextSurfaces(hslToRgb(primary), theme),
        );
        void bg;
        if (onFill < AA_NORMAL) {
            fail(`default --primary-foreground on --primary (${theme}) is ${onFill.toFixed(2)}:1`);
        }
        if (onBg < AA_NORMAL) {
            fail(`default --primary-text on --background (${theme}) is ${onBg.toFixed(2)}:1`);
        }
        console.log(
            `  default accent (${theme}): text-on-fill ${onFill.toFixed(2)}:1, ` +
                `text-on-worst-surface ${onBg.toFixed(2)}:1`,
        );

        /* ...and they must be EXACTLY what the derivation produces for
           DEFAULT_ACCENT.

           Clearing AA is not enough. The stylesheet paints the server-rendered
           first frame for a fresh account; the derivation paints every frame
           after hydration. If the two disagree the accent visibly shifts on
           load — which is the failure the whole no-flash mirror exists to
           prevent, arriving through the one door the mirror does not cover.

           They HAD drifted: the tokens were measured for hsl(212 72% 48%)
           while DEFAULT_ACCENT was #2b7fd4, a lighter blue on which white
           text is 4.14:1 and the derivation therefore picks BLACK. Same name,
           two colours, opposite foregrounds. */
        const derived = deriveAccentSteps(DEFAULT_ACCENT, theme);
        const near = (a, b) =>
            Math.abs(a.h - b.h) < 0.5 && Math.abs(a.s - b.s) < 0.5 && Math.abs(a.l - b.l) < 0.5;
        const show = (c) => `${c.h} ${c.s}% ${c.l}%`;
        for (const [name, cssValue, want] of [
            ['--primary', primary, derived.accent],
            ['--primary-foreground', fg, derived.accentForeground],
            ['--primary-text', text, derived.accentText],
        ]) {
            if (!near(cssValue, want)) {
                fail(
                    `${name} (${theme}) is ${show(cssValue)} in globals.css but ` +
                        `deriveAccentSteps(DEFAULT_ACCENT) says ${show(want)} — ` +
                        `the default accent would shift on hydration`,
                );
            }
        }
    }
}

/* ---- 2. The sweep ---- */
const HUES = Array.from({ length: 36 }, (_, i) => i * 10);
const SATS = [0, 12, 35, 60, 85, 100];
const LIGHTS = [4, 12, 25, 40, 50, 60, 75, 88, 96];

let checked = 0;
const worst = { onFill: Infinity, onBg: Infinity, fillAt: '', bgAt: '' };

for (const theme of ['light', 'dark']) {
    for (const h of HUES) {
        for (const s of SATS) {
            for (const l of LIGHTS) {
                const rgb = hslToRgb({ h, s, l });
                const hex = rgbToHex(rgb);
                const steps = deriveAccentSteps(hex, theme);
                checked++;

                if (!steps) {
                    fail(`${hex} (${theme}) did not parse`);
                    continue;
                }

                // The user's colour must survive untouched.
                const back = rgbToHex(hslToRgb(steps.accent));
                if (back.toLowerCase() !== hex.toLowerCase()) {
                    fail(`${hex} (${theme}) round-tripped to ${back} — the fill was altered`);
                }

                // Text ON the fill.
                const onFill = contrastRatio(hslToRgb(steps.accentForeground), rgb);
                if (onFill < AA_NORMAL) {
                    fail(`${hex} (${theme}) foreground on fill is ${onFill.toFixed(2)}:1`);
                }
                if (onFill < worst.onFill) {
                    worst.onFill = onFill;
                    worst.fillAt = `${hex} ${theme}`;
                }

                // Accent-coloured TEXT, on every surface it is printed on:
                // the bare page AND the page under an accent wash. Measuring
                // only the bare page is what let the toolbar's active tag chip
                // ship at 4.4:1 with this check reporting it clear.
                const onBg = worstOnSurfaces(
                    hslToRgb(steps.accentText),
                    accentTextSurfaces(rgb, theme),
                );
                if (onBg < AA_NORMAL) {
                    fail(
                        `${hex} (${theme}) accentText is ${onBg.toFixed(2)}:1 on its worst ` +
                            `surface (walked to L=${steps.accentText.l.toFixed(0)}%)`,
                    );
                }
                if (onBg < worst.onBg) {
                    worst.onBg = onBg;
                    worst.bgAt = `${hex} ${theme}`;
                }
            }
        }
    }
}

/* ---- 3. Junk input must not throw ---- */
for (const junk of ['', '   ', 'not a colour', '#12', '#gggggg', 'rgb()', '#'.repeat(50)]) {
    try {
        const r = deriveAccentSteps(junk, 'dark');
        if (r !== null) fail(`junk input ${JSON.stringify(junk)} returned a value instead of null`);
    } catch (e) {
        fail(`junk input ${JSON.stringify(junk)} threw: ${e.message}`);
    }
}

/* ---- Report ---- */
console.log(`Swept ${checked} accent colours across ${HUES.length} hues, both themes.`);
console.log(
    `  tightest text-on-fill:       ${worst.onFill.toFixed(2)}:1  (${worst.fillAt})`,
);
console.log(
    `  tightest text-on-worst-surface: ${worst.onBg.toFixed(2)}:1  (${worst.bgAt})`,
);

if (failures) {
    console.error(`\n${failures} failure(s). AA floor is ${AA_NORMAL}:1.`);
    process.exit(1);
}
console.log(`\nEvery derived step clears WCAG AA (${AA_NORMAL}:1).`);
