'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/lib/use-online-status';
import type { Note } from '@/lib/note-types';
import { isSortValue, type SortValue } from '@/lib/note-tags';
import {
    PAGE_SIZE,
    fetchNotesCount,
    fetchNotesPage,
    fetchTagCounts,
    type NotesQuery,
    type TagCount,
} from '@/lib/notes-query';
import NoteToolbar from './NoteToolbar';
import SyncStatusBanner from './SyncStatusBanner';
import { useToast } from '@/components/toast-provider';
import NoteCard from './NoteCard';
import { BookOpen, Star, Search, Plus, X, SearchX, Tag as TagIcon, AlertCircle } from 'lucide-react';
import CreateNoteModal from './CreateNoteModal';
import NotesGridSkeleton from './NotesGridSkeleton';
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

export default function NotesList({
    initialNotes,
    initialTotal,
    initialTags,
    userId,
    loadError = null,
}: {
    /** The first page, already filtered and sorted by the database. */
    initialNotes: Note[];
    /** How many notes match the current filters in total, not just here. */
    initialTotal: number;
    initialTags: TagCount[];
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

    // Which criteria the rows currently in `notes` answer. Compared against
    // the live criteria below so the client only refetches on a real change.
    const servedCriteria = useRef<string>('');

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
    //
    // A server render answers the URL's tag/sort/favourites with no search
    // term, so the paged state resets with it — and servedCriteria below is
    // marked as already answered, otherwise navigating to a tag would fetch
    // page one twice: once on the server, once again on the client.
    useEffect(() => {
        setNotes(initialNotes);
        setTotal(initialTotal);
        setTagCounts(initialTags);
        setPage(0);
        setQuery('');
        servedCriteria.current = JSON.stringify({
            query: '',
            tag: searchParams.get('tag'),
            favorites: searchParams.get('filter') === 'favorites',
            sort: isSortValue(searchParams.get('sort'))
                ? searchParams.get('sort')
                : 'newest',
        });
    }, [initialNotes, initialTotal, initialTags, searchParams]);

    // "Is the user looking at a subset?" — the difference between "you have no
    // notes" and "nothing matched", which are very different things to say.
    const isFiltered =
        query.trim() !== '' || !!activeTag || isFavoritesView;

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
        // Only when the list is genuinely empty. A search that matched nothing
        // is not a first run, and offering to seed a sample note there would
        // be nonsense.
        if (isFiltered) {
            setShowFirstRun(false);
            return;
        }
        if (notes.length > 0) {
            // They already have notes, so onboarding is moot — record that,
            // otherwise emptying the list later would introduce a first run to
            // someone who is plainly not a first-time user.
            dismissOnboarding();
            setShowFirstRun(false);
            return;
        }
        setShowFirstRun(!hasDismissedOnboarding());
    }, [notes.length, isFiltered]);

    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const supabase = createClient();

    // Paging and result totals now come from the database (0008): the page is
    // one indexed query, the count is a separate one, and search runs against
    // a tsvector rather than against whatever happened to be downloaded.
    const [total, setTotal] = useState(initialTotal);
    const [page, setPage] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [queryError, setQueryError] = useState<string | null>(null);
    const [tagCounts, setTagCounts] = useState<TagCount[]>(initialTags);
    // Bumped by realtime, so a note tagged in another tab updates the chips
    // here. Local edits go through router.refresh(), which brings a fresh
    // census with the server render.
    const [tagsNonce, setTagsNonce] = useState(0);

    const trimmedQuery = query.trim();

    const criteria: NotesQuery = useMemo(
        () => ({
            query: trimmedQuery,
            tag: activeTag,
            favorites: isFavoritesView,
            sort,
        }),
        [trimmedQuery, activeTag, isFavoritesView, sort],
    );

    // Everything the server already knows about is server state; the only
    // client-side additions are notes written offline, which by definition it
    // has never seen.
    const notesWithPending = useMemo(
        () => mergePendingCreates(notes, queuedOps),
        [notes, queuedOps],
    );
    const pendingIds = useMemo(
        () => new Set(queuedOps.map((op) => op.id)),
        [queuedOps],
    );
    const displayedNotes = notesWithPending;

    const availableTags = tagCounts;

    useEffect(() => {
        const key = JSON.stringify(criteria);
        if (servedCriteria.current === key) return;

        // Typing should not fire a request per keystroke, but changing a tag
        // or a sort order should feel immediate.
        const isTyping = criteria.query !== '';
        const controller = new AbortController();
        const timer = setTimeout(
            () => {
                servedCriteria.current = key;
                setIsSearching(true);
                setQueryError(null);
                Promise.all([
                    fetchNotesPage(supabase, criteria, 0, controller.signal),
                    fetchNotesCount(supabase, criteria, controller.signal),
                ])
                    .then(([rows, count]) => {
                        setNotes(rows);
                        setTotal(count);
                        setPage(0);
                    })
                    .catch((e) => {
                        if (controller.signal.aborted) return;
                        // Silence here would show the previous results as
                        // though they answered the new query.
                        setQueryError(
                            (e as { message?: string })?.message ??
                                'Search failed.',
                        );
                    })
                    .finally(() => {
                        if (!controller.signal.aborted) setIsSearching(false);
                    });
            },
            isTyping ? 250 : 0,
        );

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [criteria, supabase]);

    // The tag census is a full scan (54 ms on 50,000 notes), so it is
    // debounced and only re-run when realtime says something changed — never
    // per keystroke and never per page.
    useEffect(() => {
        if (tagsNonce === 0) return;
        const timer = setTimeout(() => {
            fetchTagCounts(supabase)
                .then(setTagCounts)
                // A stale chip list is a cosmetic problem; it is not worth an
                // error message, and the next server render will fix it.
                .catch(() => {});
        }, 1500);
        return () => clearTimeout(timer);
    }, [tagsNonce, supabase]);

    // Read by the realtime handler. A ref rather than a dependency, so the
    // channel is not torn down and resubscribed on every keystroke.
    const filtersRef = useRef(criteria);
    filtersRef.current = criteria;

    const hasMore = notes.length < total;

    // Scrolled into view -> fetch the next page from the server rather than
    // reveal more of an array that already held everything.
    useEffect(() => {
        if (!hasMore || isLoadingMore || isSearching) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0]?.isIntersecting) return;
                setIsLoadingMore(true);
                const next = page + 1;
                fetchNotesPage(supabase, criteria, next)
                    .then((rows) => {
                        // Merge by id. A note inserted at the top between two
                        // page requests shifts every later row down by one,
                        // which without this shows the boundary note twice.
                        setNotes((current) => {
                            const seen = new Set(current.map((n) => n.id));
                            return [
                                ...current,
                                ...rows.filter((r) => !seen.has(r.id)),
                            ];
                        });
                        setPage(next);
                    })
                    .catch((e) => {
                        setQueryError(
                            (e as { message?: string })?.message ??
                                'Could not load more notes.',
                        );
                    })
                    .finally(() => setIsLoadingMore(false));
            },
            { rootMargin: '400px' },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, isSearching, page, criteria, supabase]);

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
                    setTagsNonce((n) => n + 1);

                    // Now that the server decides what belongs in the list, a
                    // realtime row has to be checked against the same filters
                    // before being spliced in — otherwise searching for "tax"
                    // and creating a note called "lunch" makes it appear in
                    // the results.
                    const belongs = (note: Note) =>
                        !note.deleted_at &&
                        (!filtersRef.current.tag ||
                            (note.tags ?? []).includes(filtersRef.current.tag)) &&
                        (!filtersRef.current.favorites || note.is_favorite) &&
                        // A search term can only be evaluated by the database,
                        // so while one is active new rows are left to the next
                        // fetch rather than guessed at.
                        !filtersRef.current.query;

                    if (payload.eventType === 'INSERT') {
                        const added = payload.new as Note;
                        if (!belongs(added)) return;
                        setNotes((current) =>
                            current.some((n) => n.id === added.id)
                                ? current
                                : [added, ...current],
                        );
                        setTotal((t) => t + 1);
                    } else if (payload.eventType === 'DELETE') {
                        setNotes((current) => {
                            if (!current.some((n) => n.id === payload.old.id))
                                return current;
                            setTotal((t) => Math.max(0, t - 1));
                            return current.filter(
                                (note) => note.id !== payload.old.id,
                            );
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updated = payload.new as Note;
                        setNotes((current) => {
                            const present = current.some(
                                (note) => note.id === updated.id,
                            );
                            // Soft delete arrives here, not as a DELETE event.
                            // So does a note edited out of the current filter.
                            if (!belongs(updated)) {
                                if (!present) return current;
                                setTotal((t) => Math.max(0, t - 1));
                                return current.filter(
                                    (note) => note.id !== updated.id,
                                );
                            }
                            // Restored, or edited into the filter, elsewhere.
                            if (!present) {
                                setTotal((t) => t + 1);
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
        setNotes((current) => {
            if (!current.some((n) => n.id === id)) return current;
            setTotal((t) => Math.max(0, t - 1));
            return current.filter((note) => note.id !== id);
        });
    }

    function handleRestore(note: Note) {
        setNotes((current) => {
            if (current.some((n) => n.id === note.id)) return current;
            setTotal((t) => t + 1);
            return [note, ...current];
        });
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
                        className="btn-spectrum rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-[hsl(var(--spectrum-violet))]/25"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (queryError) {
            return (
                <div className={emptyStateWrapper}>
                    <div className={emptyStateIcon}>
                        <AlertCircle size={36} className="text-destructive" />
                    </div>
                    <h2 className="mb-2 text-lg font-semibold text-foreground">
                        Search failed
                    </h2>
                    <p className="mb-6 max-w-sm break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                        {queryError}
                    </p>
                    <button
                        onClick={() => refreshIfOnline(router)}
                        className="btn-spectrum rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-[hsl(var(--spectrum-violet))]/25"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        if (isSearching && displayedNotes.length === 0) {
            return <NotesGridSkeleton />;
        }

        if (notesWithPending.length === 0 && !isFiltered && showFirstRun) {
            return (
                <FirstRunPanel
                    userId={userId}
                    onDismiss={() => setShowFirstRun(false)}
                />
            );
        }

        if (notesWithPending.length === 0 && !isFiltered) {
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
                        <button className="btn-spectrum sheen flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg shadow-[hsl(var(--spectrum-violet))]/25">
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
                    {displayedNotes.map((note, index) => (
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
                {/* Scrolled into view -> fetch the next page. */}
                <div ref={sentinelRef} aria-hidden className="h-px" />
                {hasMore && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        Loading more notes...
                    </p>
                )}
                {!hasMore && total > PAGE_SIZE && (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        That&apos;s all {total} notes.
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
                {/* A failed query must not be announced as a result count —
                    the old total is still in state and would be read out as
                    though it answered the new search. */}
                {queryError
                    ? `Search failed: ${queryError}`
                    : isSearching
                    ? 'Searching...'
                    : trimmedQuery || activeTag || isFavoritesView
                    ? `${total} ${
                          total === 1 ? 'note' : 'notes'
                      } found${trimmedQuery ? ` for \u201c${query.trim()}\u201d` : ''}${
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
                            className="btn-spectrum group relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full shadow-lg shadow-[hsl(var(--spectrum-violet))]/40 hover:scale-[1.08] hover:shadow-[hsl(var(--spectrum-violet))]/60"
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
