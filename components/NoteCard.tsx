'use client';

import { createClient } from '@/lib/supabase/client';
import { extractPlainText } from '@/lib/note-text';
import { Star, Trash2, ImageIcon, Edit2, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import Image from 'next/image';
import EditNoteModal from './EditNoteModal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast-provider';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';

type Note = {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    tags: string[] | null;
    created_at: string;
    updated_at?: string | null;
};

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
    'flex items-center justify-center h-10 w-10 lg:h-7 lg:w-7 rounded-lg transition-all duration-200';

export default function NoteCard({
    note,
    onDelete,
    index = 0,
    onClick,
}: {
    note: Note;
    onDelete: (id: string) => void;
    index?: number;
    onClick?: () => void;
}) {
    const supabase = createClient();
    const toast = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingFav, setIsTogglingFav] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const previewText = useMemo(
        () => extractPlainText(note.content),
        [note.content],
    );

    async function handleDelete() {
        setIsDeleting(true);
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', note.id);

        if (error) {
            setIsDeleting(false);
            toast.error('Could not delete note', {
                description: error.message,
            });
            return;
        }

        setConfirmOpen(false);
        onDelete(note.id);
        toast.success('Note deleted', { description: note.title });
    }

    async function toggleFavorite() {
        setIsTogglingFav(true);
        const { error } = await supabase
            .from('notes')
            .update({ is_favorite: !note.is_favorite })
            .eq('id', note.id);
        if (error) {
            // The star is driven by realtime, so on failure it silently stays
            // put — without this the user has no idea the tap did nothing.
            toast.error(
                note.is_favorite
                    ? 'Could not remove from favorites'
                    : 'Could not add to favorites',
                { description: error.message },
            );
        }
        setIsTogglingFav(false);
    }

    const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex flex-col rounded-2xl border border-border/50 bg-background/50 backdrop-blur-md
                hover:border-border/80 hover:bg-foreground/5 hover:shadow-lg
                transition-all duration-300 ease-out overflow-hidden animate-fade-in ${staggerClass}
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
                    <h3 className="font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0 break-words [overflow-wrap:anywhere]">
                        {note.title}
                    </h3>
                    <div
                        className={`flex items-center gap-0.5 lg:gap-1 flex-shrink-0 transition-opacity duration-200 ${HOVER_REVEAL}`}
                    >
                        {/* Edit button */}
                        <EditNoteModal initialData={note}>
                            <button
                                title="Edit note"
                                aria-label={`Edit ${note.title}`}
                                className={`${ACTION_BUTTON} text-muted-foreground hover:text-primary hover:bg-primary/10`}
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
                                setConfirmOpen(true);
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
                <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3">
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
                        <span className="text-xs text-muted-foreground/70">
                            +{(note.tags ?? []).length - 3}
                        </span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center justify-between gap-2">
                <span
                    className="text-xs text-muted-foreground/70"
                    suppressHydrationWarning
                >
                    {timeAgo(note.created_at)}
                </span>
                {note.is_favorite && (
                    <span className="text-xs font-medium text-amber-500/80 bg-amber-400/10 px-2 py-0.5 rounded-full flex-shrink-0">
                        Favorite
                    </span>
                )}
            </div>

            {/* Delete confirmation — deleting a note is irreversible. */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent
                    className="sm:max-w-md"
                    onClick={(e) => e.stopPropagation()}
                >
                    <DialogTitle>Delete note?</DialogTitle>
                    <DialogDescription className="break-words [overflow-wrap:anywhere]">
                        &ldquo;{note.title}&rdquo; will be permanently deleted.
                        This can&apos;t be undone.
                    </DialogDescription>
                    <DialogFooter className="mt-2">
                        <button
                            type="button"
                            onClick={() => setConfirmOpen(false)}
                            disabled={isDeleting}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleDelete()}
                            disabled={isDeleting}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={15} />
                                    Delete
                                </>
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
