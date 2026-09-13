'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import type { Note } from '@/lib/note-types';
import { extractPlainText } from '@/lib/note-text';
import {
    Star,
    Trash2,
    Edit2,
    Copy,
    Share2,
    ExternalLink,
    Check,
} from 'lucide-react';
import { useState, useRef, useCallback } from 'react';
import { useToast } from '@/components/toast-provider';
import { triggerHaptic } from '@/lib/haptics';
import Link from 'next/link';

export default function NoteActionSheet({
    note,
    open,
    onOpenChange,
    onEdit,
    onToggleFavorite,
    onDelete,
}: {
    note: Note;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit: () => void;
    onToggleFavorite: () => void;
    onDelete: () => void;
}) {
    const toast = useToast();
    const [copied, setCopied] = useState(false);
    const startY = useRef<number | null>(null);
    const currentY = useRef<number>(0);
    const [dragTranslate, setDragTranslate] = useState(0);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        currentY.current = 0;
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        if (startY.current === null) return;
        const dy = e.touches[0].clientY - startY.current;
        if (dy > 0) {
            currentY.current = dy;
            setDragTranslate(dy);
        }
    }, []);

    const onTouchEnd = useCallback(() => {
        if (currentY.current > 75) {
            triggerHaptic('light');
            onOpenChange(false);
        }
        setDragTranslate(0);
        startY.current = null;
        currentY.current = 0;
    }, [onOpenChange]);

    const handleCopy = async () => {
        const text = extractPlainText(note.content);
        const fullContent = `${note.title}\n\n${text}`;
        try {
            await navigator.clipboard.writeText(fullContent);
            setCopied(true);
            triggerHaptic('success');
            toast.success('Note content copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy to clipboard');
        }
    };

    const handleShare = async () => {
        const nav = typeof navigator !== 'undefined' ? navigator : null;
        if (nav && 'share' in nav && typeof nav.share === 'function') {
            try {
                await nav.share({
                    title: note.title,
                    text: extractPlainText(note.content),
                    url: window.location.origin + `/notes/${note.id}`,
                });
                triggerHaptic('light');
                return;
            } catch {
                // Ignore cancel
                return;
            }
        }
        // Fallback to copy link
        if (typeof window !== 'undefined' && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(
                    window.location.origin + `/notes/${note.id}`,
                );
                triggerHaptic('success');
                toast.success('Note link copied to clipboard');
            } catch {
                toast.error('Could not copy link');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="fixed bottom-0 top-auto left-0 right-0 z-50 w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl rounded-b-none border-t border-[hsl(var(--tile-border))] bg-popover/95 p-0 backdrop-blur-xl shadow-2xl transition-transform ease-out data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom duration-200"
                style={{
                    transform: dragTranslate > 0 ? `translateY(${dragTranslate}px)` : undefined,
                }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Pull down gesture handle indicator */}
                <div className="flex w-full cursor-grab justify-center pt-3 pb-1">
                    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50" />
                </div>

                <div className="px-5 pt-2 pb-4">
                    <DialogTitle className="truncate text-base font-semibold text-foreground">
                        {note.title || 'Untitled Note'}
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        Quick actions & gestures
                    </DialogDescription>
                </div>

                <div className="space-y-1 px-3 pb-6">
                    {/* Open / View */}
                    <Link
                        href={`/notes/${note.id}`}
                        onClick={() => onOpenChange(false)}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                    >
                        <ExternalLink size={18} className="text-primary-text" />
                        <span>Open Note</span>
                    </Link>

                    {/* Edit */}
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('light');
                            onOpenChange(false);
                            onEdit();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                    >
                        <Edit2 size={18} className="text-primary-text" />
                        <span>Edit Details</span>
                    </button>

                    {/* Favorite */}
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('double');
                            onToggleFavorite();
                            onOpenChange(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                    >
                        <Star
                            size={18}
                            className={
                                note.is_favorite
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-muted-foreground'
                            }
                        />
                        <span>
                            {note.is_favorite
                                ? 'Remove from Favorites'
                                : 'Add to Favorites'}
                        </span>
                    </button>

                    {/* Copy Text */}
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                    >
                        {copied ? (
                            <Check size={18} className="text-emerald-500" />
                        ) : (
                            <Copy size={18} className="text-muted-foreground" />
                        )}
                        <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>

                    {/* Share */}
                    <button
                        type="button"
                        onClick={handleShare}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                    >
                        <Share2 size={18} className="text-muted-foreground" />
                        <span>Share Note</span>
                    </button>

                    <div className="my-1 border-t border-[hsl(var(--tile-border)/0.5)]" />

                    {/* Delete */}
                    <button
                        type="button"
                        onClick={() => {
                            triggerHaptic('heavy');
                            onOpenChange(false);
                            onDelete();
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/20"
                    >
                        <Trash2 size={18} />
                        <span>Move to Trash</span>
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
