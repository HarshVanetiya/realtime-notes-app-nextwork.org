/**
 * The product, drawn rather than screenshotted.
 *
 * Built from the same tokens the real app uses, so it cannot drift into
 * showing a interface that does not exist — change the theme and this changes
 * with it. The layout mirrors the actual dashboard: rail, search, tag chips,
 * a card grid, the command palette and the sync banner.
 *
 * `aria-hidden`, and deliberately so: every capability shown here is stated in
 * text elsewhere on the page, so reading the decoration aloud would be noise.
 */

const NOTES = [
    { title: 'Sourdough — hydration notes', tags: ['baking'], fav: true, lines: 3 },
    { title: 'Q3 architecture review', tags: ['work', 'rfc'], fav: false, lines: 2 },
    { title: 'Reading list', tags: ['personal'], fav: false, lines: 3 },
    { title: 'Interview debrief — platform', tags: ['work'], fav: true, lines: 2 },
    { title: 'Trip: Hokkaido, February', tags: ['travel'], fav: false, lines: 3 },
    { title: 'useSyncExternalStore gotchas', tags: ['code'], fav: false, lines: 2 },
];

function Line({ w }: { w: string }) {
    return (
        <div
            className="h-1.5 rounded-full bg-foreground/10"
            style={{ width: w }}
        />
    );
}

export default function AppPreview() {
    return (
        <div aria-hidden className="relative select-none">
            {/* ---- The window ----
                No backdrop-blur anywhere in here. backdrop-filter re-reads what
                is behind the element on every frame it is composited, which is
                exactly the wrong thing to put on a large panel that moves with
                the scroll — and the floating panels are 94% opaque, so there
                was nothing to see through in the first place. */}
            <div className="glass-panel overflow-hidden shadow-[0_40px_120px_-20px_hsl(258_90%_20%/0.45)]">
                {/* Chrome */}
                <div className="flex items-center gap-2 border-b border-border/50 bg-foreground/[0.03] px-4 py-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--spectrum-pink))]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--spectrum-amber))]/70" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--spectrum-teal))]/70" />
                    <div className="mx-auto rounded-md bg-foreground/5 px-3 py-1 text-[10px] font-medium tracking-wide text-muted-foreground">
                        prism.app/notes
                    </div>
                </div>

                <div className="flex">
                    {/* Rail */}
                    <div className="hidden w-[52px] flex-col items-center gap-4 border-r border-border/50 py-5 sm:flex">
                        <div className="bg-spectrum h-7 w-7 rounded-xl shadow-lg" />
                        <div className="mt-2 flex flex-col gap-3">
                            <div className="h-7 w-7 rounded-lg bg-[hsl(var(--spectrum-violet))]/18 ring-1 ring-[hsl(var(--spectrum-violet))]/30" />
                            <div className="h-7 w-7 rounded-lg bg-foreground/5" />
                            <div className="h-7 w-7 rounded-lg bg-foreground/5" />
                            <div className="h-7 w-7 rounded-lg bg-foreground/5" />
                        </div>
                    </div>

                    {/* Main */}
                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                        {/* Search */}
                        <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-3">
                                <div className="h-3 w-3 rounded-full border-2 border-muted-foreground/50" />
                                <span className="text-[11px] text-muted-foreground">
                                    Search notes
                                </span>
                                <span className="animate-caret ml-px h-3 w-px bg-[hsl(var(--spectrum-violet))]" />
                            </div>
                            <div className="bg-spectrum hidden h-9 w-9 rounded-xl shadow-md sm:block" />
                        </div>

                        {/* Tag chips */}
                        <div className="mb-4 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-full border border-[hsl(var(--spectrum-violet))]/45 bg-[hsl(var(--spectrum-violet))]/15 px-2.5 py-1 text-[10px] font-medium text-foreground">
                                All
                            </span>
                            {['work 12', 'baking 4', 'personal 9', 'code 7'].map((t) => (
                                <span
                                    key={t}
                                    className="rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>

                        {/* Cards */}
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
                            {NOTES.map((n, i) => (
                                <div
                                    key={n.title}
                                    className={`rounded-xl border p-3 ${
                                        n.fav
                                            ? 'border-[hsl(var(--spectrum-amber))]/35 bg-[hsl(var(--spectrum-amber))]/[0.07]'
                                            : 'border-border/60 bg-card/50'
                                    } ${i > 3 ? 'hidden lg:block' : ''}`}
                                >
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <p className="line-clamp-2 text-[11px] font-semibold leading-snug text-foreground">
                                            {n.title}
                                        </p>
                                        {n.fav && (
                                            <span className="mt-0.5 h-2 w-2 flex-shrink-0 rotate-45 rounded-[2px] bg-[hsl(var(--spectrum-amber))]" />
                                        )}
                                    </div>
                                    <div className="mb-2.5 space-y-1.5">
                                        {Array.from({ length: n.lines }).map((_, l) => (
                                            <Line
                                                key={l}
                                                w={['92%', '78%', '60%'][l] ?? '70%'}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {n.tags.map((t) => (
                                            <span
                                                key={t}
                                                className="rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                                            >
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ---- Floating layers ----
                Pulled towards the viewer with translateZ so the parallax has
                something to separate, and pushed mostly OUTSIDE the window so
                they frame it rather than sit on top of the cards they are
                meant to be floating above. Hidden on small screens, where
                there is no margin to float into. */}

            {/* Command palette */}
            <div className="layer-3 absolute -right-10 top-[26%] hidden w-[268px] md:block lg:-right-24">
                <div className="glass-panel is-floating animate-float-soft overflow-hidden shadow-[0_30px_60px_-15px_hsl(258_90%_15%/0.6)]">
                    <div className="flex items-center gap-2 border-b border-border/50 px-3.5 py-3">
                        <span className="text-[11px] text-muted-foreground">
                            Jump to, or search everything
                        </span>
                        <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            ⌘K
                        </kbd>
                    </div>
                    <div className="space-y-0.5 p-1.5">
                        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--spectrum-violet))]/15 px-2.5 py-2">
                            <span className="h-3.5 w-3.5 rounded bg-[hsl(var(--spectrum-violet))]/60" />
                            <span className="text-[11px] font-medium text-foreground">
                                Sourdough — hydration notes
                            </span>
                        </div>
                        {['Q3 architecture review', 'New note', 'Search the web'].map(
                            (label) => (
                                <div
                                    key={label}
                                    className="flex items-center gap-2 rounded-lg px-2.5 py-2"
                                >
                                    <span className="h-3.5 w-3.5 rounded bg-foreground/10" />
                                    <span className="text-[11px] text-muted-foreground">
                                        {label}
                                    </span>
                                </div>
                            ),
                        )}
                    </div>
                </div>
            </div>

            {/* Sync pill */}
            <div className="layer-2 absolute -left-8 bottom-10 hidden md:block lg:-left-16">
                <div className="glass-panel is-floating flex items-center gap-2.5 px-3.5 py-2.5 shadow-xl">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--success))]" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                    </span>
                    <span className="whitespace-nowrap text-[11px] font-medium text-foreground">
                        Synced across 3 devices
                    </span>
                </div>
            </div>
        </div>
    );
}
