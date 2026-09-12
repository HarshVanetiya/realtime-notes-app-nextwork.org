'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Laptop, Moon, Palette, Sun, Tags, LayoutGrid, Rows3 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { usePreferences } from '@/lib/use-preferences';
import {
    COLUMN_CHOICES,
    DEFAULT_PALETTE,
    setPreferences,
    tagColor,
    tagChipColors,
    tagLabel,
    type Density,
    type LayoutMode,
    type Preferences,
    type Theme,
} from '@/lib/preferences';
import AccentPicker from './AccentPicker';

type TagRow = { tag: string; count: number };

const SECTIONS = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'layout', label: 'Layout', icon: LayoutGrid },
    { id: 'tags', label: 'Tags', icon: Tags },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

/**
 * Everything configurable, in one place, opened the way ⌘K is.
 *
 * It replaces a lone light/dark toggle buried in the profile menu — a settings
 * surface that only holds one setting is a sign the others were never given
 * anywhere to live.
 */
export default function PreferencesDialog({ userId }: { userId: string | null }) {
    const [open, setOpen] = useState(false);
    const [section, setSection] = useState<SectionId>('appearance');
    const [tags, setTags] = useState<TagRow[]>([]);
    const prefs = usePreferences();
    const { theme: themeSetting, setTheme, resolvedTheme } = useTheme();
    const resolved = resolvedTheme === 'light' ? 'light' : 'dark';

    const update = useCallback(
        (patch: Partial<Preferences>) => {
            setPreferences(createClient(), userId, patch, resolved);
        },
        [userId, resolved],
    );

    // ⌘, is the platform convention for preferences, and the dialog also opens
    // from the sidebar and from the command palette.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((v) => !v);
            }
        }
        function onRequest() {
            setOpen(true);
        }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('open-preferences', onRequest);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('open-preferences', onRequest);
        };
    }, []);

    // The tag census is a full scan, so it is fetched when the dialog opens
    // rather than held open in the background.
    useEffect(() => {
        if (!open || section !== 'tags') return;
        let cancelled = false;
        void createClient()
            .rpc('note_tags')
            .then(({ data }) => {
                if (!cancelled && Array.isArray(data)) setTags(data as TagRow[]);
            });
        return () => {
            cancelled = true;
        };
    }, [open, section]);

    const setTagMeta = (tag: string, patch: { color?: string; label?: string }) => {
        const next = { ...prefs.tags, [tag]: { ...prefs.tags[tag], ...patch } };
        // An override equal to nothing is not an override — drop empty entries
        // so the blob does not accumulate dead keys against its size ceiling.
        if (!next[tag].color && !next[tag].label) delete next[tag];
        update({ tags: next });
    };

    const row = 'flex flex-wrap items-center justify-between gap-3 py-3';
    const legend = 'text-sm font-medium text-foreground';
    const hint = 'text-xs text-muted-foreground';
    const seg =
        'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    const segOn = 'bg-primary text-primary-foreground';
    const segOff = 'text-muted-foreground hover:text-foreground';

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                className="spatial-panel w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[min(72vw,860px)]"
                showCloseButton
            >
                <DialogTitle className="border-b border-border px-5 py-4 text-base font-semibold">
                    Preferences
                </DialogTitle>
                <DialogDescription className="sr-only">
                    Appearance, layout and tag settings. These follow your account
                    to any device you sign in on.
                </DialogDescription>

                <div className="flex flex-col sm:flex-row">
                    {/* Sections */}
                    <nav
                        aria-label="Preference sections"
                        className="flex gap-1 overflow-x-auto border-b border-border p-2 sm:w-44 sm:flex-col sm:border-b-0 sm:border-r"
                    >
                        {SECTIONS.map((s) => (
                            <button
                                key={s.id}
                                onClick={() => setSection(s.id)}
                                aria-current={section === s.id}
                                className={`flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                    section === s.id
                                        ? 'bg-primary/12 text-primary-text'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <s.icon size={15} />
                                {s.label}
                            </button>
                        ))}
                    </nav>

                    <div className="max-h-[min(70vh,560px)] min-w-0 flex-1 overflow-y-auto scrollbar-thin p-5">
                        {section === 'appearance' && (
                            <div className="divide-y divide-border/60">
                                <div className={row}>
                                    <div>
                                        <p className={legend}>Theme</p>
                                        <p className={hint}>
                                            System follows your device setting.
                                        </p>
                                    </div>
                                    <div className="flex gap-1 rounded-xl border border-border p-1">
                                        {(
                                            [
                                                ['light', Sun, 'Light'],
                                                ['dark', Moon, 'Dark'],
                                                ['system', Laptop, 'System'],
                                            ] as const
                                        ).map(([v, Icon, label]) => (
                                            <button
                                                key={v}
                                                onClick={() => {
                                                    setTheme(v);
                                                    update({ theme: v as Theme });
                                                }}
                                                aria-pressed={themeSetting === v}
                                                className={`${seg} flex items-center gap-1.5 ${
                                                    themeSetting === v ? segOn : segOff
                                                }`}
                                            >
                                                <Icon size={14} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="py-4">
                                    <p className={legend}>Accent</p>
                                    <p className={`${hint} mb-3`}>
                                        Used for buttons, links and the active state.
                                    </p>
                                    <AccentPicker
                                        value={prefs.accent}
                                        onChange={(hex) => update({ accent: hex })}
                                        theme={resolved}
                                    />
                                </div>

                                <div className="py-4">
                                    <p className={legend}>Tag palette</p>
                                    <p className={`${hint} mb-3`}>
                                        Tags without a colour of their own are assigned
                                        one from here.
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {prefs.palette.map((c, i) => (
                                            <input
                                                key={i}
                                                type="color"
                                                value={c}
                                                aria-label={`Palette colour ${i + 1}`}
                                                onChange={(e) => {
                                                    const next = [...prefs.palette];
                                                    next[i] = e.target.value;
                                                    update({ palette: next });
                                                }}
                                                className="h-8 w-8 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                                            />
                                        ))}
                                        <button
                                            onClick={() => update({ palette: DEFAULT_PALETTE })}
                                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {section === 'layout' && (
                            <div className="divide-y divide-border/60">
                                <div className={row}>
                                    <div>
                                        <p className={legend}>View</p>
                                        <p className={hint}>Tiles, or one note per row.</p>
                                    </div>
                                    <div className="flex gap-1 rounded-xl border border-border p-1">
                                        {(
                                            [
                                                ['grid', LayoutGrid, 'Grid'],
                                                ['list', Rows3, 'List'],
                                            ] as const
                                        ).map(([v, Icon, label]) => (
                                            <button
                                                key={v}
                                                onClick={() => update({ layout: v as LayoutMode })}
                                                aria-pressed={prefs.layout === v}
                                                className={`${seg} flex items-center gap-1.5 ${
                                                    prefs.layout === v ? segOn : segOff
                                                }`}
                                            >
                                                <Icon size={14} />
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={row}>
                                    <div>
                                        <p className={legend}>Card size</p>
                                        <p className={hint}>
                                            How big each tile is.
                                        </p>
                                    </div>
                                    <div className="flex gap-1 rounded-xl border border-border p-1">
                                        {(['compact', 'comfortable', 'large'] as const).map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => update({ density: d as Density })}
                                                aria-pressed={prefs.density === d}
                                                className={`${seg} capitalize ${
                                                    prefs.density === d ? segOn : segOff
                                                }`}
                                            >
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Only in grid mode: a list is one note per
                                    row by definition, so a ceiling on cards
                                    per row has nothing to act on. The View
                                    toggle is two rows up, so the reason it
                                    comes and goes is on screen. */}
                                {prefs.layout === 'grid' && (
                                    <div className={row}>
                                        <div>
                                            <p className={legend}>Cards per row</p>
                                            <p className={hint}>
                                                Auto fills the width; a fixed number
                                                centres the grid.
                                            </p>
                                        </div>
                                        <div className="flex gap-1 rounded-xl border border-border p-1">
                                            {COLUMN_CHOICES.map((c) => (
                                                <button
                                                    key={String(c)}
                                                    onClick={() => update({ columns: c })}
                                                    aria-pressed={prefs.columns === c}
                                                    aria-label={
                                                        c === 'auto'
                                                            ? 'Automatic cards per row'
                                                            : `${c} cards per row`
                                                    }
                                                    className={`${seg} ${
                                                        prefs.columns === c ? segOn : segOff
                                                    }`}
                                                >
                                                    {c === 'auto' ? 'Auto' : c}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className={row}>
                                    <div>
                                        <p className={legend}>Preview lines</p>
                                        <p className={hint}>
                                            How much of the note body a card shows.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={0}
                                            max={12}
                                            value={prefs.previewLines}
                                            onChange={(e) =>
                                                update({ previewLines: Number(e.target.value) })
                                            }
                                            aria-label="Preview lines"
                                            className="w-36 accent-[hsl(var(--primary))]"
                                        />
                                        <span className="w-16 text-sm tabular-nums text-muted-foreground">
                                            {prefs.previewLines === 0
                                                ? 'None'
                                                : `${prefs.previewLines} max`}
                                        </span>
                                    </div>
                                </div>

                                {(
                                    [
                                        ['showTags', 'Show tags', 'Tag chips on each card.'],
                                        ['showDate', 'Show date', 'When the note was created.'],
                                    ] as const
                                ).map(([key, label, desc]) => (
                                    <div key={key} className={row}>
                                        <div>
                                            <p className={legend}>{label}</p>
                                            <p className={hint}>{desc}</p>
                                        </div>
                                        <button
                                            role="switch"
                                            aria-checked={prefs[key]}
                                            aria-label={label}
                                            onClick={() => update({ [key]: !prefs[key] })}
                                            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                                prefs[key] ? 'bg-primary' : 'bg-muted'
                                            }`}
                                        >
                                            {/* `left-0.5` is load-bearing. Without an
                                                explicit left this is positioned at its
                                                STATIC position, and a <button> defaults to
                                                `text-align: center` — so a zero-width inline
                                                span starts at the middle of the 44px track,
                                                not its left edge. The 22px "on" offset then
                                                put the knob at x=44 on a 44px track: fully
                                                outside it. Now: off 2→22px, on 22→42px. */}
                                            <span
                                                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-fast ease-spring ${
                                                    prefs[key] ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {section === 'tags' && (
                            <div>
                                <p className={`${hint} mb-4`}>
                                    Renaming here changes only how a tag is displayed —
                                    the tag stored on the note is untouched, so filtering
                                    and search keep working.
                                </p>
                                {tags.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-muted-foreground">
                                        No tags yet. Add one to a note and it appears here.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-border/60">
                                        {tags.map(({ tag, count }) => (
                                            <li
                                                key={tag}
                                                className="flex flex-wrap items-center gap-3 py-2.5"
                                            >
                                                <input
                                                    type="color"
                                                    value={tagColor(tag, prefs)}
                                                    aria-label={`Colour for ${tag}`}
                                                    onChange={(e) =>
                                                        setTagMeta(tag, { color: e.target.value })
                                                    }
                                                    className="h-7 w-7 flex-shrink-0 cursor-pointer rounded-lg border border-border bg-background p-0.5"
                                                />
                                                <span
                                                    className="flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium"
                                                    // The same chip the cards
                                                    // draw, so the preview is
                                                    // the real thing.
                                                    style={tagChipColors(tag, prefs)}
                                                >
                                                    {tagLabel(tag, prefs)}
                                                </span>
                                                <input
                                                    value={prefs.tags[tag]?.label ?? ''}
                                                    placeholder={tag}
                                                    aria-label={`Display label for ${tag}`}
                                                    onChange={(e) =>
                                                        setTagMeta(tag, { label: e.target.value })
                                                    }
                                                    className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                />
                                                <span className="w-16 flex-shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                                    {count} {count === 1 ? 'note' : 'notes'}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                    {userId
                        ? 'Saved to your account — these follow you to any device.'
                        : 'Saved on this device only.'}
                </p>
            </DialogContent>
        </Dialog>
    );
}
