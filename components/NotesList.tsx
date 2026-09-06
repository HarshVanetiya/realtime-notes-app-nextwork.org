'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';
import { extractPlainText } from '@/lib/note-text';
import type { Note } from '@/lib/note-types';
import {
    collectTags,
    isSortValue,
    sortNotes,
    type SortValue,
} from '@/lib/note-tags';
import NoteToolbar from './NoteToolbar';
import SyncStatusBanner from './SyncStatusBanner';
import { useToast } from '@/components/toast-provider';
import NoteCard from './NoteCard';
import { BookOpen, Star, Search, Plus, X, SearchX, Tag as TagIcon, AlertCircle } from 'lucide-react';
import CreateNoteModal from './CreateNoteModal';
import FirstRunPanel from './FirstRunPanel';
import { dismissOnboarding, hasDismissedOnboarding } from '@/lib/onboarding';
import {
    queueServerSnapshot,
    queueSnapshot,
    subscribeQueue,
} from '@/lib/offline-queue';
import {
    flushQueue,
    mergePendingCreates,
    refreshIfOnline,
} from '@/lib/notes-api';

import { useSearchParams, useRouter } from 'next/navigation';

const PAGE_SIZE = 24;

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

    const toast = useToast();
    const isOnline = useOnlineStatus();
    const [notes, setNotes] = useState<Note[]>(initialNotes);

    // Realtime never replays what was missed while disconnected, so a dropped
    // subscription leaves this list quietly wrong until it is refetched.
    const [channelState, setChannelState] = useState<
        'connecting' | 'live' | 'interrupted'
    >('connecting');
    const [retryNonce, setRetryNonce] = useState(0);
    const [showBanner, setShowBanner] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const everLive = useRef(false);
    const droppedSinceLive = useRef(false);
    const [query, setQuery] = useState('');
    // initialNotes is a fresh array on every server render, so this is also what
    // lets router.refresh() heal the list after a drop. Without it the useState
    // seed above is read once and every later server render is ignored.
    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    // Writes made while the connection was gone. Subscribed rather than
    // polled so the badge and the banner count update the moment one is
    // queued or flushed.
    const queuedOps = useSyncExternalStore(
        subscribeQueue,
        queueSnapshot,
        queueServerSnapshot,
    );

    // Onboarding is decided on the client, because the flag lives in
    // localStorage and doesn't exist during the server render. Seeding this
    // from storage in useState would hydration-mismatch, so it starts false and
    // an effect corrects it — one frame of the plain empty state, which is the
    // honest thing to show before we know.
    const [showFirstRun, setShowFirstRun] = useState(false);
    useEffect(() => {
        if (notes.length > 0) {
            // They already have notes, so onboarding is moot — record that,
            // otherwise emptying the list later would introduce a first run to
            // someone who is plainly not a first-time user.
            dismissOnboarding();
            setShowFirstRun(false);
            return;
        }
        setShowFirstRun(!hasDismissedOnboarding());
    }, [notes.length]);

    // Cards are rendered in batches rather than all at once — the whole set
    // stays in state so search still covers every note.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const supabase = createClient();



    // A note written offline is a real note as far as this list is concerned:
    // searchable, taggable, and sorted in place. It carries the id it will
    // keep on the server, so when the row finally arrives the placeholder is
    // the same note rather than a duplicate.
    const notesWithPending = useMemo(
        () => mergePendingCreates(notes, queuedOps),
        [notes, queuedOps],
    );
    const pendingIds = useMemo(
        () => new Set(queuedOps.map((op) => op.id)),
        [queuedOps],
    );

    // Title + body text per note, so typing in the search box doesn't reparse
    // every note document on every keystroke.
    const searchIndex = useMemo(() => {
        const index = new Map<string, string>();
        notesWithPending.forEach((note) => {
            index.set(
                note.id,
                `${note.title} ${(note.tags ?? []).join(' ')} ${extractPlainText(
                    note.content,
                )}`.toLowerCase(),
            );
        });
        return index;
    }, [notesWithPending]);

    const trimmedQuery = query.trim().toLowerCase();

    const displayedNotes = useMemo(() => {
        let result = isFavoritesView
            ? notesWithPending.filter((note) => note.is_favorite)
            : notesWithPending;

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
    }, [
        notesWithPending,
        isFavoritesView,
        activeTag,
        trimmedQuery,
        searchIndex,
        sort,
    ]);

    const availableTags = useMemo(
        () => collectTags(notesWithPending),
        [notesWithPending],
    );

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
                        const updated = payload.new as Note;
                        setNotes((current) => {
                            // Soft delete arrives here, not as a DELETE event.
                            if (updated.deleted_at) {
                                return current.filter(
                                    (note) => note.id !== updated.id,
                                );
                            }
                            // Restored elsewhere: it is not in this list yet.
                            if (!current.some((note) => note.id === updated.id)) {
                                return [updated, ...current];
                            }
                            return current.map((note) =>
                                note.id === updated.id ? updated : note,
                            );
                        });
                    }
                },
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setChannelState('live');
                } else if (
                    status === 'CHANNEL_ERROR' ||
                    status === 'TIMED_OUT' ||
                    status === 'CLOSED'
                ) {
                    setChannelState('interrupted');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId, retryNonce]);

    // Anything that isn't live counts as degraded, including 'connecting'.
    // Treating connecting as healthy made the banner unmount the instant Retry
    // was pressed and reappear seconds later.
    const degraded = !isOnline || channelState !== 'live';

    // A rejoin often succeeds within a second or two; only a sustained failure
    // is worth putting on screen. Losing the network is definitive, so that
    // shows at once.
    useEffect(() => {
        if (!degraded) {
            setShowBanner(false);
            return;
        }
        if (!isOnline) {
            setShowBanner(true);
            return;
        }
        const timer = setTimeout(() => setShowBanner(true), 4000);
        return () => clearTimeout(timer);
    }, [degraded, isOnline]);

    // Replay queued writes whenever a path back to the server appears. Both
    // triggers commonly fire within the same second, which is why flushQueue
    // serialises internally rather than relying on this effect not to race.
    useEffect(() => {
        // Gated on the browser being online, not on realtime being live:
        // realtime can be blocked by a corporate proxy or simply slow to
        // rejoin, and queued writes must not be held hostage to it. The
        // channelState dependency is still here so a rejoin re-triggers a
        // flush; flushQueue serialises, so the overlap is free.
        if (!isOnline) return;
        let cancelled = false;
        (async () => {
            const report = await flushQueue(supabase);
            if (cancelled || (report.synced === 0 && report.dropped.length === 0))
                return;
            if (report.synced > 0) {
                router.refresh();
                toast.success(
                    report.synced === 1
                        ? 'Synced 1 offline change'
                        : `Synced ${report.synced} offline changes`,
                );
            }
            for (const drop of report.dropped) {
                // Silently discarding these is how an offline edit disappears
                // without anyone noticing it was ever made.
                toast.error('An offline change could not be applied', {
                    description: drop.reason,
                });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOnline, channelState, supabase, router, toast]);

    // Coming back is the moment the list has to be refetched — and the one
    // moment worth a toast, because it is an event rather than a state.
    useEffect(() => {
        if (channelState === 'interrupted' && everLive.current) {
            droppedSinceLive.current = true;
        }
        if (channelState !== 'live') return;

        if (droppedSinceLive.current) {
            droppedSinceLive.current = false;
            router.refresh();
            toast.success('Reconnected', {
                description: 'Notes refreshed from the server.',
            });
        }
        everLive.current = true;
    }, [channelState, router, toast]);

    function retrySync() {
        // A failing channel can error again within milliseconds, so without a
        // floor the spinner never paints and the click looks ignored.
        setIsRetrying(true);
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => setIsRetrying(false), 1200);

        setChannelState('connecting');
        setRetryNonce((n) => n + 1);
        router.refresh();
    }

    useEffect(
        () => () => {
            if (retryTimer.current) clearTimeout(retryTimer.current);
        },
        [],
    );

    function handleDelete(id: string) {
        setNotes((current) => current.filter((note) => note.id !== id));
    }

    function handleRestore(note: Note) {
        setNotes((current) =>
            current.some((n) => n.id === note.id)
                ? current
                : [note, ...current],
        );
    }

    const emptyStateWrapper =
        'flex flex-col items-center justify-center px-6 py-16 sm:py-24 text-center bg-card/60 border border-border/50 rounded-3xl mt-4';
    const emptyStateIcon =
        'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-foreground/5 border border-border/50 shadow-sm flex items-center justify-center mb-6';

    function renderContent() {
        if (loadError && notesWithPending.length === 0) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <AlertCircle size={36} className="text-destructive" />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-foreground">
                        Couldn&apos;t load your notes
                    </h2>
                    <p className="mb-6 max-w-sm break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {loadError}
                    </p>
                    <button
                        onClick={() => refreshIfOnline(router)}
                        className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (notesWithPending.length === 0 && showFirstRun) {
            return (
                <FirstRunPanel
                    userId={userId}
                    onDismiss={() => setShowFirstRun(false)}
                />
            );
        }

        if (notesWithPending.length === 0) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <BookOpen size={36} className="text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No notes yet
                    </h2>
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
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No matching notes
                    </h2>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs break-words [overflow-wrap:anywhere]">
                        Nothing here matches &ldquo;{query.trim()}&rdquo;
                        {isFavoritesView ? ' in your favorites' : ''}.
                    </p>
                    <div className="flex flex-col items-center gap-3 sm:flex-row">
                        <button
                            onClick={() => setQuery('')}
                            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                        >
                            Clear search
                        </button>
                        {/* Nothing here matches, so hand the query onward
                            rather than leaving a dead end. The palette owns the
                            web search, so this reuses it instead of building a
                            second one. */}
                        <button
                            onClick={() =>
                                document.dispatchEvent(
                                    new CustomEvent('open-command-palette', {
                                        detail: { query: query.trim() },
                                    }),
                                )
                            }
                            className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                        >
                            Search the web instead
                        </button>
                    </div>
                </div>
            );
        }

        if (displayedNotes.length === 0 && activeTag) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <TagIcon size={36} className="text-muted-foreground" />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-foreground">
                        Nothing tagged &ldquo;{activeTag}&rdquo;
                    </h2>
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
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        No favorites yet
                    </h2>
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
                            onRestore={handleRestore}
                            index={index}
                            pending={pendingIds.has(note.id)}
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


    return (
        <>
            {/* Every page needs an h1; the dashboard's is visual chrome-free,
                so it is exposed to assistive tech only. */}
            <h1 className="sr-only">
                {isFavoritesView ? 'Favorite notes' : 'My notes'}
                {activeTag ? ` tagged ${activeTag}` : ''}
            </h1>

            {/* Filtering the grid changed what was on screen with no
                announcement at all — to a screen reader the page simply went
                quiet. Polite, so it waits for a pause in typing. */}
            <p aria-live="polite" className="sr-only">
                {trimmedQuery || activeTag || isFavoritesView
                    ? `${displayedNotes.length} ${
                          displayedNotes.length === 1 ? 'note' : 'notes'
                      } shown${trimmedQuery ? ` for \u201c${query.trim()}\u201d` : ''}${
                          activeTag ? ` tagged ${activeTag}` : ''
                      }${isFavoritesView ? ' in favorites' : ''}`
                    : ''}
            </p>

            {(showBanner || queuedOps.length > 0) && (
                <SyncStatusBanner
                    state={isOnline ? 'interrupted' : 'offline'}
                    onRetry={retrySync}
                    isRetrying={isRetrying}
                    pendingCount={queuedOps.length}
                    /* Queued writes are worth surfacing even once the
                       connection is healthy again — the flush takes a moment,
                       and until it finishes those notes exist only here. */
                    healthy={!showBanner}
                />
            )}

            {/* Notes grid */}
            <div className="animate-fade-in">
                {notesWithPending.length > 0 && (
                    <NoteToolbar
                        tags={availableTags}
                        activeTag={activeTag}
                        sort={sort}
                    />
                )}
                {renderContent()}
            </div>

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
                            className="relative z-10 flex-shrink-0 text-muted-foreground transition-all duration-300 group-focus-within:text-primary-text"
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

                </div>
            </div>
        </>
    );
}
