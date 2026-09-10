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
} = mod;

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
        const onBg = contrastRatio(hslToRgb(text), hslToRgb(bg));
        if (onFill < AA_NORMAL) {
            fail(`default --primary-foreground on --primary (${theme}) is ${onFill.toFixed(2)}:1`);
        }
        if (onBg < AA_NORMAL) {
            fail(`default --primary-text on --background (${theme}) is ${onBg.toFixed(2)}:1`);
        }
        console.log(
            `  default accent (${theme}): text-on-fill ${onFill.toFixed(2)}:1, ` +
                `text-on-background ${onBg.toFixed(2)}:1`,
        );
    }
}

/* ---- 2. The sweep ---- */
const HUES = Array.from({ length: 36 }, (_, i) => i * 10);
const SATS = [0, 12, 35, 60, 85, 100];
const LIGHTS = [4, 12, 25, 40, 50, 60, 75, 88, 96];

let checked = 0;
const worst = { onFill: Infinity, onBg: Infinity, fillAt: '', bgAt: '' };

for (const theme of ['light', 'dark']) {
    const bgRgb = hslToRgb(BACKGROUND[theme]);

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

                // Accent-coloured TEXT on the page.
                const onBg = contrastRatio(hslToRgb(steps.accentText), bgRgb);
                if (onBg < AA_NORMAL) {
                    fail(
                        `${hex} (${theme}) accentText on background is ${onBg.toFixed(2)}:1 ` +
                            `(walked to L=${steps.accentText.l.toFixed(0)}%)`,
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
    `  tightest text-on-background: ${worst.onBg.toFixed(2)}:1  (${worst.bgAt})`,
);

if (failures) {
    console.error(`\n${failures} failure(s). AA floor is ${AA_NORMAL}:1.`);
    process.exit(1);
}
console.log(`\nEvery derived step clears WCAG AA (${AA_NORMAL}:1).`);
