'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import {
    FileText,
    Plus,
    Star,
    Tag as TagIcon,
    Sun,
    Moon,
    Globe,
    Search,
    ArrowDownUp,
    Keyboard,
    Download,
    SlidersHorizontal,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchNotesPage } from '@/lib/notes-query';
import { collectTags, SORT_OPTIONS } from '@/lib/note-tags';
import CreateNoteModal from './CreateNoteModal';
import ShortcutsDialog from './ShortcutsDialog';

// Only what the list renders. The body used to be fetched so cmdk could match
// against it in the browser; the database matches now, so it stays on the
// server and every palette open is that much lighter.
type PaletteNote = {
    id: string;
    title: string;
    tags: string[] | null;
};

// Long enough for a slow connection, short enough that the palette stays usable.
const REQUEST_TIMEOUT_MS = 5000;
// The palette is a jump list, not a results page — more than this and it
// stops being scannable.
const MAX_RESULTS = 8;

const ITEM =
    'flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground outline-none data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary-text';

export default function CommandPalette() {
    const router = useRouter();
    const { resolvedTheme, setTheme } = useTheme();

    const [open, setOpen] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [notes, setNotes] = useState<PaletteNote[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    // Global shortcuts. `?` is ignored while the caret is in a field, otherwise
    // it would fire mid-sentence in the editor.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            const target = e.target as HTMLElement | null;
            const typing =
                !!target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable);

            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }
            if (e.key === 'n' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
                e.preventDefault();
                setCreateOpen(true);
                return;
            }
            if (e.key === '?' && !typing && !open) {
                e.preventDefault();
                setHelpOpen(true);
            }
        }
        // Callers can seed the search box — the "search the web instead" action
        // in an empty result set hands its query straight over rather than
        // making the user retype it.
        function onOpenRequest(e: Event) {
            const seed = (e as CustomEvent<{ query?: string }>).detail?.query;
            if (typeof seed === 'string') setQuery(seed);
            setOpen(true);
        }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('open-command-palette', onOpenRequest);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('open-command-palette', onOpenRequest);
        };
    }, [open]);

    // Searched server-side, debounced, rather than downloading every note when
    // the palette opens. That download was fine at fifty notes and was the same
    // ceiling the dashboard had; now the database does the matching, against
    // the same tsvector the dashboard uses, so the two agree about what
    // "matches" means.
    useEffect(() => {
        if (!open) return;
        const term = query.trim();
        let cancelled = false;
        const controller = new AbortController();

        const timer = setTimeout(
            async () => {
                setLoading(true);
                setLoadError(null);
                try {
                    const supabase = createClient();
                    // Bounded: on a dead or very slow connection the request
                    // can hang indefinitely, and an unbounded wait would leave
                    // the palette showing "Loading notes..." forever.
                    const timeout = setTimeout(
                        () => controller.abort(),
                        REQUEST_TIMEOUT_MS,
                    );
                    const rows = await fetchNotesPage(
                        supabase,
                        { query: term, tag: null, favorites: false, sort: 'newest' },
                        0,
                        controller.signal,
                    );
                    clearTimeout(timeout);
                    if (cancelled) return;
                    setNotes(
                        rows.slice(0, MAX_RESULTS).map((n) => ({
                            id: n.id,
                            title: n.title,
                            tags: n.tags,
                        })),
                    );
                } catch (e) {
                    if (cancelled) return;
                    // Without this the palette sat on "Loading notes..."
                    // forever whenever the query failed.
                    // Supabase rejects with a PostgrestError — a plain object,
                    // not an Error — so an `instanceof Error` check alone
                    // throws away the message it does carry.
                    const name =
                        typeof e === 'object' && e !== null && 'name' in e
                            ? String((e as { name?: unknown }).name)
                            : '';
                    const message =
                        typeof e === 'object' && e !== null && 'message' in e
                            ? String((e as { message?: unknown }).message)
                            : '';
                    // Supabase re-wraps the abort, so the timeout shows up in
                    // the message rather than the name.
                    const timedOut = /Timeout|Abort/i.test(`${name} ${message}`);
                    setLoadError(
                        timedOut
                            ? 'the request timed out'
                            : message || 'unknown error',
                    );
                } finally {
                    if (!cancelled) setLoading(false);
                }
            },
            term ? 200 : 0,
        );

        return () => {
            cancelled = true;
            controller.abort();
            clearTimeout(timer);
        };
    }, [open, query]);

    const run = useCallback((fn: () => void) => {
        setOpen(false);
        setQuery('');
        // Let the dialog close before navigating, so focus lands cleanly.
        requestAnimationFrame(fn);
    }, []);

    const tags = collectTags(notes);
    const trimmed = query.trim();

    return (
        <>
            <Command.Dialog
                open={open}
                onOpenChange={setOpen}
                label="Command palette"
                shouldFilter
                className="spatial-panel fixed left-1/2 top-[15%] z-[80] w-[min(92vw,640px)] -translate-x-1/2 overflow-hidden shadow-xl"
            >
                <div className="flex items-center gap-3 border-b border-border/60 px-4">
                    <Search size={17} className="flex-shrink-0 text-muted-foreground" />
                    <Command.Input
                        value={query}
                        onValueChange={setQuery}
                        placeholder="Search notes, jump to a tag, or run a command..."
                        className="h-14 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <kbd className="hidden flex-shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:block">
                        ESC
                    </kbd>
                </div>

                <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto scrollbar-thin p-2">
                    {loading && (
                        <Command.Loading className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Loading notes...
                        </Command.Loading>
                    )}

                    {loadError && (
                        <div className="px-3 py-4 text-center text-sm text-destructive">
                            Couldn&apos;t load your notes: {loadError}
                            <div className="mt-1 text-xs text-muted-foreground">
                                Commands and web search still work.
                            </div>
                        </div>
                    )}

                    {/* Suppressed while loading, otherwise the palette claims
                        nothing matches and that it is still loading at once. */}
                    {!loading && (
                        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Nothing here matches. Try the web search below.
                        </Command.Empty>
                    )}

                    <Command.Group
                        // The database already decided which notes match, so
                        // cmdk must not filter them again: it matches on the
                        // item's `value`, which cannot contain the body text a
                        // server-side match may have been found in. forceMount
                        // on both the group and its items hands the decision to
                        // the query that actually ran.
                        forceMount
                        heading="Notes"
                        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                    >
                        {notes.map((note) => (
                            <Command.Item
                                key={note.id}
                                forceMount
                                // Kept distinct per note so cmdk's own
                                // bookkeeping (selection, arrow keys) still has
                                // a stable identity to work with.
                                value={`__note__ ${note.id}`}
                                onSelect={() => run(() => router.push(`/notes/${note.id}`))}
                                className={ITEM}
                            >
                                <FileText size={15} className="flex-shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">{note.title}</span>
                                {(note.tags ?? []).length > 0 && (
                                    <span className="flex-shrink-0 truncate text-xs text-muted-foreground">
                                        {(note.tags ?? []).slice(0, 2).join(' · ')}
                                    </span>
                                )}
                            </Command.Item>
                        ))}
                    </Command.Group>

                    <Command.Group
                        heading="Actions"
                        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                    >
                        <Command.Item value="new note create" onSelect={() => run(() => setCreateOpen(true))} className={ITEM}>
                            <Plus size={15} className="flex-shrink-0 text-muted-foreground" />
                            New note
                            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘N</kbd>
                        </Command.Item>
                        <Command.Item value="favorites starred" onSelect={() => run(() => router.push('/notes?filter=favorites'))} className={ITEM}>
                            <Star size={15} className="flex-shrink-0 text-muted-foreground" />
                            Favorites
                        </Command.Item>
                        <Command.Item value="all notes dashboard" onSelect={() => run(() => router.push('/notes'))} className={ITEM}>
                            <FileText size={15} className="flex-shrink-0 text-muted-foreground" />
                            All notes
                        </Command.Item>
                        <Command.Item
                            value="export download all notes markdown backup"
                            // A same-tab navigation to a route that answers with
                            // Content-Disposition: attachment — the browser
                            // downloads it and stays where it is.
                            onSelect={() => run(() => { window.location.href = '/notes/export'; })}
                            className={ITEM}
                        >
                            <Download size={15} className="flex-shrink-0 text-muted-foreground" />
                            Export all notes as Markdown
                        </Command.Item>
                        <Command.Item
                            value="preferences settings appearance accent theme layout tags colors"
                            onSelect={() =>
                                run(() =>
                                    document.dispatchEvent(
                                        new CustomEvent('open-preferences'),
                                    ),
                                )
                            }
                            className={ITEM}
                        >
                            <SlidersHorizontal size={15} className="flex-shrink-0 text-muted-foreground" />
                            Preferences
                            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘,</kbd>
                        </Command.Item>
                        <Command.Item value="keyboard shortcuts help" onSelect={() => run(() => setHelpOpen(true))} className={ITEM}>
                            <Keyboard size={15} className="flex-shrink-0 text-muted-foreground" />
                            Keyboard shortcuts
                            <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">?</kbd>
                        </Command.Item>
                    </Command.Group>

                    {tags.length > 0 && (
                        <Command.Group
                            heading="Tags"
                            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                        >
                            {tags.map(({ tag, count }) => (
                                <Command.Item
                                    key={tag}
                                    value={`tag ${tag}`}
                                    onSelect={() => run(() => router.push(`/notes?tag=${encodeURIComponent(tag)}`))}
                                    className={ITEM}
                                >
                                    <TagIcon size={15} className="flex-shrink-0 text-muted-foreground" />
                                    <span className="min-w-0 flex-1 truncate">{tag}</span>
                                    <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">{count}</span>
                                </Command.Item>
                            ))}
                        </Command.Group>
                    )}

                    <Command.Group
                        heading="Sort"
                        className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                    >
                        {SORT_OPTIONS.map((o) => (
                            <Command.Item
                                key={o.value}
                                value={`sort by ${o.label}`}
                                onSelect={() =>
                                    run(() =>
                                        router.push(
                                            o.value === 'newest' ? '/notes' : `/notes?sort=${o.value}`,
                                        ),
                                    )
                                }
                                className={ITEM}
                            >
                                <ArrowDownUp size={15} className="flex-shrink-0 text-muted-foreground" />
                                Sort by {o.label.toLowerCase()}
                            </Command.Item>
                        ))}
                        <Command.Item
                            value="toggle theme dark light appearance"
                            onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
                            className={ITEM}
                        >
                            {resolvedTheme === 'dark' ? <Sun size={15} className="flex-shrink-0 text-muted-foreground" /> : <Moon size={15} className="flex-shrink-0 text-muted-foreground" />}
                            Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
                        </Command.Item>
                    </Command.Group>

                    {/* Always mounted and always last: when nothing here matches,
                        the query is handed to the web rather than dead-ending.
                        This opens a new tab — it is not an embedded search. */}
                    {trimmed.length > 0 && (
                        <Command.Group
                            // The item is forceMount, but cmdk still marks a
                            // group hidden when its own filter matches nothing
                            // in it — which hid the web search behind the very
                            // "nothing matches, try the web search below" text
                            // that points at it.
                            forceMount
                            heading="Web"
                            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground"
                        >
                            <Command.Item
                                forceMount
                                value={`__web__ ${trimmed}`}
                                onSelect={() =>
                                    run(() =>
                                        window.open(
                                            `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`,
                                            '_blank',
                                            'noopener,noreferrer',
                                        ),
                                    )
                                }
                                className={ITEM}
                            >
                                <Globe size={15} className="flex-shrink-0 text-muted-foreground" />
                                <span className="min-w-0 flex-1 truncate">
                                    Search the web for &ldquo;{trimmed}&rdquo;
                                </span>
                                <span className="flex-shrink-0 text-xs text-muted-foreground">opens a new tab</span>
                            </Command.Item>
                        </Command.Group>
                    )}
                </Command.List>
            </Command.Dialog>

            <CreateNoteModal open={createOpen} onOpenChange={setCreateOpen} />
            <ShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
        </>
    );
}
