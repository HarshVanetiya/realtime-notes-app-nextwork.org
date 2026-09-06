'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useMediaQuery } from '@/lib/use-media-query';
import { extractPlainText } from '@/lib/note-text';
import {
    collectTags,
    isSortValue,
    sortNotes,
    type SortValue,
} from '@/lib/note-tags';
import NoteToolbar from './NoteToolbar';
import NoteCard from './NoteCard';
import { BookOpen, Star, Search, Plus, X, SearchX, Tag as TagIcon, AlertCircle } from 'lucide-react';
import CreateNoteModal from './CreateNoteModal';

import { useSearchParams, useRouter } from 'next/navigation';

// Pulls in BlockNote, Mantine, react-rnd and framer-motion. Windows are
// desktop-only and open on demand, so this chunk should load on demand too —
// a phone never fetches it at all.
const NoteWindow = dynamic(() => import('./NoteWindow'), { ssr: false });

export type WindowState = {
    id: string; // usually note.id
    note: Note;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
};

const PAGE_SIZE = 24;

type Note = {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    tags: string[] | null; // null on rows fetched before the tags migration
    created_at: string;
    updated_at?: string | null;
};

export default function NotesList({
    initialNotes,
    userId,
    loadError = null,
}: {
    initialNotes: Note[];
    userId: string;
    /** Set when the server query failed — without it an empty list is
     *  indistinguishable from "you have no notes", which is a lie. */
    loadError?: string | null;
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isFavoritesView = searchParams.get('filter') === 'favorites';
    const activeTag = searchParams.get('tag');
    const sortParam = searchParams.get('sort');
    const sort: SortValue = isSortValue(sortParam) ? sortParam : 'newest';

    // Floating windows are a pointer-and-keyboard affordance: draggable frames
    // wider than a phone. Below `lg` we open the note's own page instead.
    const isDesktop = useMediaQuery('(min-width: 1024px)');

    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [query, setQuery] = useState('');
    // Cards are rendered in batches rather than all at once — the whole set
    // stays in state so search still covers every note.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const supabase = createClient();

    const [windows, setWindows] = useState<WindowState[]>([]);
    const [topZIndex, setTopZIndex] = useState(10); // To keep track of the active window

    // Inside NotesList.tsx, add these helper functions
    function updateWindow(id: string, updates: Partial<WindowState>) {
        setWindows((current) =>
            current.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        );
    }

    function closeWindow(id: string) {
        setWindows((current) => current.filter((w) => w.id !== id));
    }

    function bringToFront(id: string) {
        setTopZIndex((z) => z + 1);
        updateWindow(id, { zIndex: topZIndex + 1 });
    }

    // Function to open a note
    function openWindow(note: Note) {
        setWindows((current) => {
            // If already open, just bring to front and unminimize
            const existing = current.find((w) => w.id === note.id);
            if (existing) {
                return current.map((w) =>
                    w.id === note.id
                        ? { ...w, zIndex: topZIndex + 1, isMinimized: false }
                        : w,
                );
            }
            // Otherwise, open a new window
            return [
                ...current,
                {
                    id: note.id,
                    note,
                    isMinimized: false,
                    isMaximized: false,
                    zIndex: topZIndex + 1,
                },
            ];
        });
        setTopZIndex((z) => z + 1);
    }

    function handleOpenNote(note: Note) {
        if (!isDesktop) {
            router.push(`/notes/${note.id}`);
            return;
        }
        openWindow(note);
    }

    // Title + body text per note, so typing in the search box doesn't reparse
    // every note document on every keystroke.
    const searchIndex = useMemo(() => {
        const index = new Map<string, string>();
        notes.forEach((note) => {
            index.set(
                note.id,
                `${note.title} ${(note.tags ?? []).join(' ')} ${extractPlainText(
                    note.content,
                )}`.toLowerCase(),
            );
        });
        return index;
    }, [notes]);

    const trimmedQuery = query.trim().toLowerCase();

    const displayedNotes = useMemo(() => {
        let result = isFavoritesView
            ? notes.filter((note) => note.is_favorite)
            : notes;

        if (activeTag) {
            result = result.filter((note) =>
                (note.tags ?? []).includes(activeTag),
            );
        }

        if (trimmedQuery) {
            result = result.filter((note) =>
                (searchIndex.get(note.id) ?? '').includes(trimmedQuery),
            );
        }

        return sortNotes(result, sort);
    }, [notes, isFavoritesView, activeTag, trimmedQuery, searchIndex, sort]);

    const availableTags = useMemo(() => collectTags(notes), [notes]);

    // A narrowed result set shouldn't inherit a scrolled-down count.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [trimmedQuery, isFavoritesView, activeTag, sort]);

    const hasMore = visibleCount < displayedNotes.length;

    useEffect(() => {
        if (!hasMore) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setVisibleCount((c) => c + PAGE_SIZE);
                }
            },
            { rootMargin: '400px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, displayedNotes.length]);

    useEffect(() => {
        const channel = supabase
            .channel('notes-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'notes',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        setNotes((current) => [
                            payload.new as Note,
                            ...current,
                        ]);
                    } else if (payload.eventType === 'DELETE') {
                        setNotes((current) =>
                            current.filter(
                                (note) => note.id !== payload.old.id,
                            ),
                        );
                    } else if (payload.eventType === 'UPDATE') {
                        setNotes((current) =>
                            current.map((note) =>
                                note.id === (payload.new as Note).id
                                    ? (payload.new as Note)
                                    : note,
                            ),
                        );
                    }
                },
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    function handleDelete(id: string) {
        setNotes((current) => current.filter((note) => note.id !== id));
        closeWindow(id);
    }

    const emptyStateWrapper =
        'flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center bg-background/50 backdrop-blur-sm border border-border/40 rounded-3xl mt-4';
    const emptyStateIcon =
        'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-foreground/5 border border-border/50 shadow-sm flex items-center justify-center mb-6';

    function renderContent() {
        if (loadError && notes.length === 0) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <AlertCircle size={36} className="text-destructive" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        Couldn&apos;t load your notes
                    </h3>
                    <p className="mb-6 max-w-sm break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {loadError}
                    </p>
                    <button
                        onClick={() => router.refresh()}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (notes.length === 0) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <BookOpen size={36} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No notes yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Start capturing your thoughts, ideas, and anything worth
                        remembering.
                    </p>
                    <CreateNoteModal>
                        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
                            Create your first note
                        </button>
                    </CreateNoteModal>
                </div>
            );
        }

        if (displayedNotes.length === 0 && trimmedQuery) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <SearchX size={36} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No matching notes
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs break-words [overflow-wrap:anywhere]">
                        Nothing here matches &ldquo;{query.trim()}&rdquo;
                        {isFavoritesView ? ' in your favorites' : ''}.
                    </p>
                    <button
                        onClick={() => setQuery('')}
                        className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                        Clear search
                    </button>
                </div>
            );
        }

        if (displayedNotes.length === 0 && activeTag) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <TagIcon size={36} className="text-muted-foreground" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                        Nothing tagged &ldquo;{activeTag}&rdquo;
                    </h3>
                    <p className="mb-6 max-w-xs break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {isFavoritesView
                            ? 'No favorites carry this tag.'
                            : 'No notes carry this tag yet.'}
                    </p>
                    <button
                        onClick={() => router.push('/notes')}
                        className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground"
                    >
                        Show all notes
                    </button>
                </div>
            );
        }

        if (displayedNotes.length === 0) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <Star size={36} className="text-amber-400/80" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No favorites yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Star a note to add it to your favorites for quick
                        access.
                    </p>
                    <button
                        onClick={() => router.push('/notes')}
                        className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                        View all notes
                    </button>
                </div>
            );
        }

        return (
            <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedNotes.slice(0, visibleCount).map((note, index) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onDelete={handleDelete}
                            index={index}
                            onClick={() => handleOpenNote(note)}
                        />
                    ))}
                </div>
                {/* Scrolled into view -> render the next batch. */}
                <div ref={sentinelRef} aria-hidden className="h-px" />
                {hasMore && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Loading more notes...
                    </p>
                )}
                <div className="pb-32" />
            </>
        );
    }

    const minimized = windows.filter((w) => w.isMinimized);

    return (
        <>
            {/* Notes grid */}
            <div className="animate-fade-in">
                {notes.length > 0 && (
                    <NoteToolbar
                        tags={availableTags}
                        activeTag={activeTag}
                        sort={sort}
                    />
                )}
                {renderContent()}
            </div>

            {/* Render Windows — desktop only */}
            {isDesktop &&
                windows.map((window) => (
                    <NoteWindow
                        key={window.id}
                        window={window}
                        updateWindow={updateWindow}
                        closeWindow={closeWindow}
                        bringToFront={bringToFront}
                    />
                ))}

            {/* Floating Bottom Navigation Islands.
                Full-width shell so the row can never push past the viewport edge,
                and safe-area padding so it clears the iOS home indicator. */}
            <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-[calc(env(safe-area-inset-bottom)+2rem)]">
                <div className="pointer-events-auto flex max-w-full items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom-12 duration-700 fade-in ease-out-back">
                    {/* Search Capsule (Island 1) */}
                    <div className="group relative flex h-14 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-full border border-border/50 bg-background/70 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl transition-all duration-500 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/30 hover:border-primary/40 hover:shadow-primary/20 sm:max-w-[380px] sm:gap-3 sm:px-6 md:max-w-[460px] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] dark:focus-within:bg-white/10">
                        {/* Animated shine effect on hover */}
                        <div className="pointer-events-none absolute top-0 -left-[100%] z-0 block h-full w-1/2 -skew-x-12 transform bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:animate-shine group-hover:opacity-100"></div>

                        <Search
                            size={20}
                            className="relative z-10 flex-shrink-0 text-muted-foreground transition-all duration-300 group-focus-within:text-primary"
                        />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notes..."
                            aria-label="Search notes"
                            className="relative z-10 h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label="Clear search"
                                className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Create Note Button (Island 2) */}
                    <CreateNoteModal>
                        <button
                            aria-label="Create note"
                            className="group relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.15] hover:shadow-primary/50 active:scale-95"
                        >
                            {/* Inner glow on hover */}
                            <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100"></div>
                            <Plus
                                size={26}
                                className="relative z-10 stroke-[2.5] transition-transform duration-500 ease-in-out group-hover:rotate-90"
                            />
                        </button>
                    </CreateNoteModal>

                    {/* Minimized Windows (Island 3+) — scrolls rather than
                        widening the row once several notes are minimized. */}
                    {isDesktop && minimized.length > 0 && (
                        <div className="flex min-w-0 items-center gap-3 overflow-x-auto scrollbar-thin animate-in slide-in-from-left-4 fade-in duration-300">
                            {/* Divider */}
                            <div className="mx-1 h-8 w-px flex-shrink-0 rounded-full bg-border/80"></div>

                            {minimized.map((w) => (
                                <button
                                    key={w.id}
                                    onClick={() =>
                                        updateWindow(w.id, {
                                            isMinimized: false,
                                            zIndex: topZIndex + 1,
                                        })
                                    }
                                    title={w.note.title}
                                    className="group relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 shadow-xl backdrop-blur-xl transition-all duration-300 hover:-translate-y-2 hover:scale-110 animate-in zoom-in-50 fade-in"
                                >
                                    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                                        {w.note.image_url ? (
                                            <Image
                                                src={w.note.image_url}
                                                alt={w.note.title}
                                                fill
                                                sizes="56px"
                                                className="object-cover"
                                            />
                                        ) : (
                                            <BookOpen
                                                size={20}
                                                className="text-primary/70 transition-colors group-hover:text-primary"
                                            />
                                        )}
                                    </div>

                                    {/* Tooltip on hover */}
                                    <span className="pointer-events-none absolute -top-12 left-1/2 z-50 max-w-[200px] -translate-x-1/2 truncate rounded-lg bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg backdrop-blur-sm transition-all duration-200 group-hover:opacity-100">
                                        {w.note.title}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
