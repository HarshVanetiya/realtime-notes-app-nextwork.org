'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import {
    contrastRatio,
    deriveAccentSteps,
    hslToRgb,
    parseColor,
    rgbToHex,
    AA_NORMAL,
} from '@/lib/color';
import { ACCENT_PRESETS } from '@/lib/preferences';

/**
 * Four ways into the same value: swatches, the OS colour picker, a hex field
 * and three RGB fields.
 *
 * The hex and RGB inputs keep their own draft state while being typed —
 * committing on every keystroke would mean "#2b7" briefly parses as a valid
 * three-digit hex and repaints the whole interface mid-word. They commit on a
 * complete, parseable value and revert on blur if it never became one.
 */
export default function AccentPicker({
    value,
    onChange,
    theme,
}: {
    value: string;
    onChange: (hex: string) => void;
    theme: 'light' | 'dark';
}) {
    const [hexDraft, setHexDraft] = useState(value);
    const rgb = parseColor(value) ?? { r: 0, g: 0, b: 0 };

    // Follow the value when it changes from elsewhere (a swatch, or the row
    // arriving from the server) without clobbering what is being typed.
    useEffect(() => setHexDraft(value), [value]);

    const steps = deriveAccentSteps(value, theme);
    const onFill = steps
        ? contrastRatio(hslToRgb(steps.accentForeground), hslToRgb(steps.accent))
        : 0;

    const commitHex = (raw: string) => {
        const parsed = parseColor(raw);
        if (parsed) onChange(rgbToHex(parsed));
    };

    const setChannel = (key: 'r' | 'g' | 'b', raw: string) => {
        const n = Math.max(0, Math.min(255, Math.round(Number(raw) || 0)));
        onChange(rgbToHex({ ...rgb, [key]: n }));
    };

    const field =
        'h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring';

    return (
        <div className="space-y-4">
            {/* Presets */}
            <div className="flex flex-wrap gap-2">
                {ACCENT_PRESETS.map((p) => {
                    const active = p.value.toLowerCase() === value.toLowerCase();
                    // The tick sits ON the swatch, so its colour is the same
                    // question the accent foreground answers everywhere else.
                    // It was hard-coded white, which disappears on the lighter
                    // presets.
                    const tick = deriveAccentSteps(p.value, theme)?.accentForeground;
                    return (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => onChange(p.value)}
                            aria-pressed={active}
                            aria-label={p.name}
                            title={p.name}
                            className="relative h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-transform duration-fast ease-spring hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            style={{ backgroundColor: p.value }}
                        >
                            {active && (
                                <Check
                                    size={14}
                                    strokeWidth={3}
                                    className="absolute inset-0 m-auto"
                                    style={{
                                        color: tick
                                            ? `hsl(${tick.h} ${tick.s}% ${tick.l}%)`
                                            : undefined,
                                    }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Exact value */}
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Picker</span>
                    <input
                        type="color"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        aria-label="Accent colour"
                        className="h-9 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                    />
                </label>

                <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Hex</span>
                    <input
                        value={hexDraft}
                        onChange={(e) => {
                            setHexDraft(e.target.value);
                            commitHex(e.target.value);
                        }}
                        onBlur={() => setHexDraft(value)}
                        spellCheck={false}
                        className={`${field} w-28 font-mono`}
                    />
                </label>

                {(['r', 'g', 'b'] as const).map((k) => (
                    <label key={k} className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium uppercase text-muted-foreground">
                            {k}
                        </span>
                        <input
                            type="number"
                            min={0}
                            max={255}
                            value={rgb[k]}
                            onChange={(e) => setChannel(k, e.target.value)}
                            className={`${field} w-[4.5rem] tabular-nums`}
                        />
                    </label>
                ))}
            </div>

            {/* What the choice actually does.
                Shown rather than enforced: the fill stays exactly the colour
                picked, and only the small text step is nudged to stay legible.
                Saying so is more useful than silently repainting it. */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/50 px-3 py-2.5">
                <span
                    className="rounded-lg px-3 py-1.5 text-sm font-semibold"
                    style={{
                        backgroundColor: value,
                        color: steps
                            ? `hsl(${steps.accentForeground.h} ${steps.accentForeground.s}% ${steps.accentForeground.l}%)`
                            : '#fff',
                    }}
                >
                    Button
                </span>
                <span
                    className="text-sm font-semibold"
                    style={{
                        color: steps
                            ? `hsl(${steps.accentText.h} ${steps.accentText.s}% ${steps.accentText.l}%)`
                            : undefined,
                    }}
                >
                    Accent text
                </span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                    {onFill >= AA_NORMAL ? 'AA' : 'below AA'} · {onFill.toFixed(1)}:1 on the fill
                    {steps?.report.adjusted
                        ? ' · text step lightened to stay readable'
                        : ''}
                </span>
            </div>
        </div>
    );
}
