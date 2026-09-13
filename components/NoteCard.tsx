'use client';

import { createClient } from '@/lib/supabase/client';
import { extractPlainText } from '@/lib/note-text';
import type { Note } from '@/lib/note-types';
import {
    Star,
    Trash2,
    ImageIcon,
    Edit2,
    CloudUpload,
    Eye,
    EyeOff,
} from 'lucide-react';
import { useMemo, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import EditNoteModal from './EditNoteModal';
import { useToast } from '@/components/toast-provider';
import SpatialSurface from './SpatialSurface';
import { usePreferences } from '@/lib/use-preferences';
import { DENSITY, tagChipColors, tagLabel } from '@/lib/preferences';
import { updateNote } from '@/lib/notes-api';
import StarBurst, { type BurstOrigin } from './StarBurst';
import NoteActionSheet from './NoteActionSheet';
import { triggerHaptic } from '@/lib/haptics';

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
// they stay visible for comfortable tapping.
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
    const prefs = usePreferences();
    const shape = DENSITY[prefs.density];
    const isList = prefs.layout === 'list';
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingFav, setIsTogglingFav] = useState(false);
    const [burstOrigin, setBurstOrigin] = useState<BurstOrigin | null>(null);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [peekImage, setPeekImage] = useState(false);

    // Mobile gesture tracking: Touch Swipe & Long Press
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const lastTapRef = useRef<number>(0);
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPressRef = useRef<boolean>(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

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
        triggerHaptic('success');
        toast.success(queued ? 'Restored offline' : 'Note restored', {
            description: queued ? 'Will sync when you reconnect.' : undefined,
        });
    }

    async function handleDelete() {
        setIsDeleting(true);
        triggerHaptic('heavy');
        onDelete(note.id);

        const { error, queued } = await updateNote(supabase, note.id, {
            deleted_at: new Date().toISOString(),
        });

        setIsDeleting(false);

        if (error) {
            onRestore?.(note);
            toast.error('Could not delete note', { description: error });
            return;
        }

        toast.success(queued ? 'Moved to trash offline' : 'Note moved to trash', {
            description: queued
                ? `\u201c${note.title}\u201d will sync when you reconnect.`
                : note.title,
            action: { label: 'Undo', onClick: () => void restore() },
        });
    }

    const toggleFavorite = useCallback(
        async (coords?: { x: number; y: number }) => {
            setIsTogglingFav(true);
            const willFavorite = !note.is_favorite;

            // Trigger celebratory particle burst and haptic vibration
            if (willFavorite) {
                triggerHaptic('double');
                const x = coords?.x ?? 120;
                const y = coords?.y ?? 120;
                setBurstOrigin({ x, y, id: Date.now() });
            } else {
                triggerHaptic('light');
            }

            const { error } = await updateNote(supabase, note.id, {
                is_favorite: willFavorite,
            });

            if (error) {
                toast.error(
                    note.is_favorite
                        ? 'Could not remove from favorites'
                        : 'Could not add to favorites',
                    { description: error },
                );
            }
            setIsTogglingFav(false);
        },
        [note.id, note.is_favorite, supabase, toast],
    );

    // Double tap & long press handlers on mobile touch
    const onTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
        isLongPressRef.current = false;
        setIsDragging(false);

        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            isLongPressRef.current = true;
            triggerHaptic('medium');
            setIsActionSheetOpen(true);
        }, 450);
    };

    const onTouchMove = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX.current;
        const dy = touch.clientY - touchStartY.current;

        // Cancel long press if finger moved
        if (Math.hypot(dx, dy) > 10 && longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        // Horizontal swipe gesture for quick actions
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) {
            setIsDragging(true);
            // Rubber band resistance past 80px
            const damped =
                Math.sign(dx) *
                (Math.min(80, Math.abs(dx)) +
                    Math.max(0, Math.abs(dx) - 80) * 0.25);
            setDragOffset(damped);
        }
    };

    const onTouchEnd = (e: React.TouchEvent) => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (isLongPressRef.current) {
            setDragOffset(0);
            setIsDragging(false);
            return;
        }

        // Check if swiped past threshold
        if (dragOffset < -65) {
            // Swiped left: Delete
            void handleDelete();
            setDragOffset(0);
            setIsDragging(false);
            return;
        } else if (dragOffset > 65) {
            // Swiped right: Favorite
            const rect = cardRef.current?.getBoundingClientRect();
            const touch = e.changedTouches[0];
            const x = rect ? touch.clientX - rect.left : 100;
            const y = rect ? touch.clientY - rect.top : 100;
            void toggleFavorite({ x, y });
            setDragOffset(0);
            setIsDragging(false);
            return;
        }

        setDragOffset(0);
        setIsDragging(false);

        // Check for double tap
        const now = Date.now();
        const diff = now - lastTapRef.current;
        if (diff > 50 && diff < 340) {
            // Double tapped!
            const rect = cardRef.current?.getBoundingClientRect();
            const touch = e.changedTouches[0];
            const x = rect ? touch.clientX - rect.left : 120;
            const y = rect ? touch.clientY - rect.top : 120;
            void toggleFavorite({ x, y });
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    };

    const onTouchCancel = () => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        setDragOffset(0);
        setIsDragging(false);
    };

    // Double click on desktop
    const handleDoubleClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        void toggleFavorite({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    const hasImage = Boolean(note.image_url);

    return (
        <div
            ref={cardRef}
            className="relative select-none overflow-hidden rounded-[1.25rem]"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
        >
            {/* Underlying swipe reveal trays */}
            {/* Left swipe tray (Destructive / Delete) */}
            <div
                className={`absolute inset-y-0 right-0 z-0 flex w-24 items-center justify-center rounded-r-[1.25rem] bg-destructive/20 text-destructive transition-opacity ${
                    dragOffset < -15 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <div
                    className="flex flex-col items-center gap-1 transition-transform"
                    style={{
                        transform: `scale(${Math.min(1.25, Math.max(0.7, Math.abs(dragOffset) / 60))})`,
                    }}
                >
                    <Trash2 size={22} className="stroke-[2.2]" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                        Delete
                    </span>
                </div>
            </div>

            {/* Right swipe tray (Favorite / Star) */}
            <div
                className={`absolute inset-y-0 left-0 z-0 flex w-24 items-center justify-center rounded-l-[1.25rem] bg-amber-500/20 text-amber-500 transition-opacity ${
                    dragOffset > 15 ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            >
                <div
                    className="flex flex-col items-center gap-1 transition-transform"
                    style={{
                        transform: `scale(${Math.min(1.25, Math.max(0.7, dragOffset / 60))})`,
                    }}
                >
                    <Star size={22} className="stroke-[2.2]" fill="currentColor" />
                    <span className="text-[10px] font-semibold tracking-wider uppercase">
                        Star
                    </span>
                </div>
            </div>

            {/* Main Interactive Spatial Surface */}
            <div
                style={{
                    transform: `translateX(${dragOffset}px)`,
                    transition: isDragging
                        ? 'none'
                        : 'transform var(--duration-base) var(--ease-spring)',
                }}
            >
                <SpatialSurface
                    onClick={() => {}}
                    className={`
                        relative flex flex-col animate-fade-in
                        ${note.is_favorite ? 'ring-1 ring-amber-400/35 shadow-[0_0_20px_-5px_rgba(251,191,36,0.2)]' : ''}
                        ${isDeleting ? 'opacity-50 scale-95 pointer-events-none' : ''}
                        hover:shadow-[0_16px_36px_-10px_hsl(var(--primary)/0.25)]
                        transition-shadow duration-300
                    `}
                >
                    {/* Double-tap star burst celebration particle explosion */}
                    {burstOrigin && (
                        <StarBurst
                            origin={burstOrigin}
                            onComplete={() => setBurstOrigin(null)}
                        />
                    )}

                    {/* Edge-to-Edge Image Cover Background with Slanted Gradient & Soft Blur */}
                    {hasImage && note.image_url ? (
                        <div
                            aria-hidden
                            className="absolute inset-0 z-0 overflow-hidden"
                        >
                            <Image
                                src={note.image_url}
                                alt={`Attachment for ${note.title}`}
                                fill
                                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
                                    peekImage ? 'brightness-105 scale-105' : ''
                                }`}
                            />

                            {/* Top dark vignette for crisp contrast on top actions */}
                            <div
                                className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/75 via-black/35 to-transparent transition-opacity duration-300 ${
                                    peekImage ? 'opacity-20' : 'opacity-100'
                                }`}
                            />

                            {/* Slanted gradient / bottom scrim for pristine text readability */}
                            <div
                                className={`absolute inset-0 bg-gradient-to-t from-background/98 via-background/88 via-45% to-transparent transition-opacity duration-300 ${
                                    peekImage ? 'opacity-10' : 'opacity-100'
                                }`}
                            />

                            {/* Bottom soft blur strip */}
                            <div
                                className={`absolute inset-x-0 bottom-0 h-3/5 backdrop-blur-[3px] [mask-image:linear-gradient(to_top,black_55%,transparent_100%)] transition-opacity duration-300 ${
                                    peekImage ? 'opacity-0' : 'opacity-100'
                                }`}
                            />

                            {/* Subtle angled slant accent line */}
                            <div
                                className={`absolute inset-x-0 bottom-[calc(48%+2px)] h-px bg-gradient-to-r from-transparent via-primary/35 to-transparent -rotate-1 transition-opacity duration-300 ${
                                    peekImage ? 'opacity-0' : 'opacity-100'
                                }`}
                            />
                        </div>
                    ) : (
                        /* Subtle ambient mesh background for clean notes without images */
                        <div
                            aria-hidden
                            className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-primary/[0.035] via-transparent to-primary/[0.015]"
                        />
                    )}

                    {/* Card Content Shell */}
                    <div
                        onDoubleClick={handleDoubleClick}
                        style={{
                            animationDelay: `${Math.min(index * 30, 300)}ms`,
                        }}
                        className={`relative z-10 flex min-h-0 flex-1 flex-col ${
                            isList ? '' : 'sm:aspect-[var(--tile-ratio)]'
                        }`}
                    >
                        {/* Body */}
                        <div className="flex min-h-0 flex-1 flex-col p-4">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                {/* Stretched link for accessible navigation */}
                                <h2 className="font-semibold text-foreground leading-snug line-clamp-2 flex-1 min-w-0 break-words [overflow-wrap:anywhere] drop-shadow-sm">
                                    <Link
                                        href={`/notes/${note.id}`}
                                        className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
                                    >
                                        {note.title}
                                    </Link>
                                </h2>

                                <div
                                    className={`relative z-20 flex items-center gap-0.5 lg:gap-1 flex-shrink-0 transition-opacity duration-fast ease-standard ${HOVER_REVEAL}`}
                                >
                                    {/* Image peek toggle button */}
                                    {hasImage && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPeekImage(!peekImage);
                                                triggerHaptic('light');
                                            }}
                                            title={
                                                peekImage
                                                    ? 'Restore reading view'
                                                    : 'Peek full image'
                                            }
                                            aria-label="Toggle image peek"
                                            className={`${ACTION_BUTTON} text-muted-foreground hover:text-foreground hover:bg-background/40 backdrop-blur-sm`}
                                        >
                                            {peekImage ? (
                                                <EyeOff size={15} />
                                            ) : (
                                                <Eye size={15} />
                                            )}
                                        </button>
                                    )}

                                    {/* Edit button */}
                                    <EditNoteModal
                                        initialData={note}
                                        open={isEditModalOpen}
                                        onOpenChange={setIsEditModalOpen}
                                    >
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
                                            const rect =
                                                e.currentTarget.getBoundingClientRect();
                                            void toggleFavorite({
                                                x: e.clientX - rect.left,
                                                y: e.clientY - rect.top,
                                            });
                                        }}
                                        disabled={isTogglingFav}
                                        aria-pressed={note.is_favorite}
                                        title={
                                            note.is_favorite
                                                ? 'Remove from favorites (or double-tap)'
                                                : 'Add to favorites (or double-tap)'
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
                                            className={`transition-all duration-200 ${
                                                isTogglingFav ? 'animate-pulse scale-125' : ''
                                            }`}
                                            fill={
                                                note.is_favorite
                                                    ? 'currentColor'
                                                    : 'none'
                                            }
                                        />
                                    </button>

                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            void handleDelete();
                                        }}
                                        title="Delete note (or swipe left)"
                                        aria-label={`Delete ${note.title}`}
                                        className={`${ACTION_BUTTON} text-muted-foreground hover:text-destructive hover:bg-destructive/10`}
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>

                            {/* Standing favorite marker for hover reveal */}
                            {note.is_favorite && (
                                <div className="absolute top-4 right-4 hidden [@media(hover:hover)]:block opacity-100 group-hover:opacity-0 transition-opacity">
                                    <Star
                                        size={14}
                                        className="text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]"
                                        fill="currentColor"
                                    />
                                </div>
                            )}

                            {/* Note body excerpt */}
                            {previewText && prefs.previewLines > 0 && (
                                <p
                                    style={{
                                        ['--lines' as string]: String(
                                            Math.min(
                                                prefs.previewLines,
                                                shape.previewLines,
                                            ),
                                        ),
                                    }}
                                    className="mb-3 min-h-0 flex-1 overflow-hidden text-sm leading-relaxed text-muted-foreground break-words [overflow-wrap:anywhere] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:var(--lines)] [mask-image:linear-gradient(to_bottom,#000_75%,transparent_100%)]"
                                >
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

                        {/* Tags */}
                        {prefs.showTags && (note.tags ?? []).length > 0 && (
                            <div className="relative z-10 flex flex-shrink-0 flex-wrap items-center gap-1.5 px-4 pb-3">
                                {(note.tags ?? []).slice(0, 3).map((tag) => (
                                    <span
                                        key={tag}
                                        style={tagChipColors(tag, prefs)}
                                        className="max-w-full break-all rounded-md border px-1.5 py-0.5 text-xs font-medium backdrop-blur-sm shadow-xs"
                                    >
                                        {tagLabel(tag, prefs)}
                                    </span>
                                ))}
                                {(note.tags ?? []).length > 3 && (
                                    <span className="text-xs text-muted-foreground">
                                        +{(note.tags ?? []).length - 3}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-auto flex flex-shrink-0 items-center justify-between gap-2 px-4 pb-4">
                            <span
                                className="text-xs text-muted-foreground"
                                suppressHydrationWarning
                            >
                                {prefs.showDate ? timeAgo(note.created_at) : ''}
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
                            </span>
                        </div>
                    </div>
                </SpatialSurface>
            </div>

            {/* Mobile Long Press Action Sheet */}
            <NoteActionSheet
                note={note}
                open={isActionSheetOpen}
                onOpenChange={setIsActionSheetOpen}
                onEdit={() => setIsEditModalOpen(true)}
                onToggleFavorite={() => void toggleFavorite()}
                onDelete={() => void handleDelete()}
            />
        </div>
    );
}
