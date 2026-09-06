'use client';

import { createClient } from '@/lib/supabase/client';
import { extractPlainText } from '@/lib/note-text';
import type { Note } from '@/lib/note-types';
import { Star, Trash2, ImageIcon, Edit2, CloudUpload } from 'lucide-react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import EditNoteModal from './EditNoteModal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast-provider';
import { updateNote } from '@/lib/notes-api';

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    });
}

// Actions are revealed on hover only where hovering actually exists. On touch
// there is no hover, so they stay visible — otherwise they are invisible but
// still tappable, which makes Delete a trap.
const HOVER_REVEAL =
    'opacity-100 focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100';

// Comfortable thumb target on touch, unchanged density on desktop.
const ACTION_BUTTON =
    'flex items-center justify-center h-10 w-10 lg:h-7 lg:w-7 rounded-lg transition-colors duration-fast ease-standard';

export default function NoteCard({
    note,
    onDelete,
    onRestore,
    index = 0,
    pending = false,
}: {
    note: Note;
    onDelete: (id: string) => void;
    /** Puts the note back after an undo, or after a failed delete. */
    onRestore?: (note: Note) => void;
    index?: number;
    /** Written offline and not yet on the server. */
    pending?: boolean;
}) {
    const supabase = createClient();
    const toast = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingFav, setIsTogglingFav] = useState(false);

    const previewText = useMemo(
        () => extractPlainText(note.content),
        [note.content],
    );

    async function restore() {
        const { error, queued } = await updateNote(supabase, note.id, {
            deleted_at: null,
        });

        if (error) {
            toast.error('Could not restore note', { description: error });
            return;
        }
        onRestore?.(note);
        toast.success(queued ? 'Restored offline' : 'Note restored', {
            description: queued ? 'Will sync when you reconnect.' : undefined,
        });
    }

    async function handleDelete() {
        // Optimistic: the card goes immediately, because waiting on a round
        // trip to remove something makes deletion feel broken.
        setIsDeleting(true);
        onDelete(note.id);

        const { error, queued } = await updateNote(supabase, note.id, {
            deleted_at: new Date().toISOString(),
        });

        setIsDeleting(false);

        if (error) {
            // Put it back rather than leaving the UI claiming a delete that
            // never happened.
            onRestore?.(note);
            toast.error('Could not delete note', { description: error });
            return;
        }

        // Undo is a one-column update, so it cannot fail the way re-inserting a
        // destroyed row could — and offline it is queued the same way.
        toast.success(queued ? 'Moved to trash offline' : 'Note moved to trash', {
            description: queued
                ? `\u201c${note.title}\u201d will sync when you reconnect.`
                : note.title,
            action: { label: 'Undo', onClick: () => void restore() },
        });
    }

    async function toggleFavorite() {
        setIsTogglingFav(true);
        const { error } = await updateNote(supabase, note.id, {
            is_favorite: !note.is_favorite,
        });
        if (error) {
            // The star is driven by realtime, so on failure it silently stays
            // put — without this the user has no idea the tap did nothing.
            toast.error(
                note.is_favorite
                    ? 'Could not remove from favorites'
                    : 'Could not add to favorites',
                { description: error },
            );
        }
        setIsTogglingFav(false);
    }


    return (
        <div
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            className={`
                group relative flex flex-col rounded-2xl border border-border/60 bg-card/70
                hover:border-primary/30 hover:bg-foreground/[0.03] hover:shadow-lg
                motion-safe:hover:-translate-y-0.5
                overflow-hidden animate-fade-in
                transition-[transform,box-shadow,border-color,background-color]
                duration-base ease-standard
                ${note.is_favorite ? 'border-amber-400/30 bg-amber-500/10' : ''}
                ${isDeleting ? 'opacity-50 scale-95 pointer-events-none' : ''}
            `}
        >
            {/* Favorite indicator stripe */}
            {note.is_favorite && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400" />
            )}

            {/* Image */}
            {note.image_url ? (
                <div className="relative h-36 overflow-hidden bg-muted border-b border-border/40">
                    <Image
                        src={note.image_url}
                        alt={`Attachment for ${note.title}`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            ) : null}

            {/* Body */}
            <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    {/* A stretched link: real link semantics (ctrl/middle-click,
                        announced as a link, reachable by Tab) while the whole
                        card stays clickable via the ::after overlay. */}
                    <h2 className="font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0 break-words [overflow-wrap:anywhere]">
                        <Link
                            href={`/notes/${note.id}`}
                            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                        >
                            {note.title}
                        </Link>
                    </h2>
                    <div
                        className={`relative z-10 flex items-center gap-0.5 lg:gap-1 flex-shrink-0 transition-opacity duration-fast ease-standard ${HOVER_REVEAL}`}
                    >
                        {/* Edit button */}
                        <EditNoteModal initialData={note}>
                            <button
                                title="Edit note"
                                aria-label={`Edit ${note.title}`}
                                className={`${ACTION_BUTTON} text-muted-foreground hover:text-primary-text hover:bg-primary/10`}
                            >
                                <Edit2 size={15} />
                            </button>
                        </EditNoteModal>
                        {/* Favorite button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                void toggleFavorite();
                            }}
                            disabled={isTogglingFav}
                            aria-pressed={note.is_favorite}
                            title={
                                note.is_favorite
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                            }
                            className={`
                                ${ACTION_BUTTON}
                                ${
                                    note.is_favorite
                                        ? 'text-amber-400 hover:text-amber-500 hover:bg-amber-400/10'
                                        : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'
                                }
                            `}
                        >
                            <Star
                                size={15}
                                className={`transition-all duration-200 ${isTogglingFav ? 'animate-pulse' : ''}`}
                                fill={
                                    note.is_favorite ? 'currentColor' : 'none'
                                }
                            />
                        </button>
                        {/* Delete button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                void handleDelete();
                            }}
                            title="Delete note"
                            aria-label={`Delete ${note.title}`}
                            className={`${ACTION_BUTTON} text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* Standing favorite marker, for the hover-reveal case only —
                    on touch the action row above is always visible and would collide. */}
                {note.is_favorite && (
                    <div className="absolute top-4 right-4 hidden [@media(hover:hover)]:block opacity-100 group-hover:opacity-0 transition-opacity">
                        <Star
                            size={14}
                            className="text-amber-400"
                            fill="currentColor"
                        />
                    </div>
                )}

                {previewText && (
                    <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere]">
                        {previewText}
                    </p>
                )}

                {/* No content indicator */}
                {!note.image_url && !previewText && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-3">
                        <ImageIcon size={12} />
                        <span>No content</span>
                    </div>
                )}
            </div>

            {/* Tags — capped so a heavily tagged note can't unbalance the grid */}
            {(note.tags ?? []).length > 0 && (
                <div className="relative z-10 flex flex-wrap items-center gap-1.5 px-4 pb-3">
                    {(note.tags ?? []).slice(0, 3).map((tag) => (
                        <Badge
                            key={tag}
                            variant="secondary"
                            className="max-w-full break-all py-0.5 font-medium"
                        >
                            {tag}
                        </Badge>
                    ))}
                    {(note.tags ?? []).length > 3 && (
                        <span className="text-xs text-muted-foreground">
                            +{(note.tags ?? []).length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center justify-between gap-2">
                <span
                    className="text-xs text-muted-foreground"
                    suppressHydrationWarning
                >
                    {timeAgo(note.created_at)}
                </span>
                <span className="flex flex-shrink-0 items-center gap-2">
                    {pending && (
                        <span
                            title="Saved on this device — not yet synced"
                            className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-text"
                        >
                            <CloudUpload size={11} />
                            Pending sync
                        </span>
                    )}
                    {note.is_favorite && (
                        <span className="text-xs font-medium text-amber-500/80 bg-amber-400/10 px-2 py-0.5 rounded-full">
                            Favorite
                        </span>
                    )}
                </span>
            </div>

        </div>
    );
}
