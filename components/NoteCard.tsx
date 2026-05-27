'use client';

import { createClient } from '@/lib/supabase/client';
import { Star, Trash2, ImageIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

type Note = {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    created_at: string;
};

const ALLOWED_HTML_TAGS = new Set([
    'a',
    'b',
    'blockquote',
    'br',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'i',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'u',
    'ul',
]);

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

// Replace toPlainTextHtml and sanitizeNoteHtml with this:
function extractPreviewText(content: string) {
    if (!content) return '';

    try {
        // 1. Try to parse it as our new BlockNote JSON
        const blocks = JSON.parse(content);
        let text = '';

        // Recursively dig through the blocks to find text
        const extractText = (block: any) => {
            if (block.content && Array.isArray(block.content)) {
                block.content.forEach((c: any) => {
                    if (c.type === 'text' && c.text) text += c.text + ' ';
                });
            }
            if (block.children && Array.isArray(block.children)) {
                block.children.forEach(extractText);
            }
        };

        blocks.forEach(extractText);
        const finalText = text.trim();
        return finalText ? `<p>${escapeHtml(finalText)}</p>` : '';
    } catch {
        // 2. If JSON.parse fails, it's the old HTML format!
        if (typeof window === 'undefined') return '';
        const doc = new DOMParser().parseFromString(content, 'text/html');
        const text = doc.body.textContent || '';
        return text.trim() ? `<p>${escapeHtml(text.trim())}</p>` : '';
    }
}

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

export default function NoteCard({
    note,
    onDelete,
    index = 0,
    onClick,
}: {
    note: Note;
    onDelete: (id: string) => void;
    index?: number;
    onClick?: () => void; // New type definition
}) {
    const supabase = createClient();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingFav, setIsTogglingFav] = useState(false);
    const [renderedContent, setRenderedContent] = useState(() =>
        note.content ? extractPreviewText(note.content) : '',
    );

    useEffect(() => {
        setRenderedContent(
            note.content ? extractPreviewText(note.content) : '',
        );
    }, [note.content]);

    async function handleDelete() {
        setIsDeleting(true);
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', note.id);

        if (error) {
            console.error('Error deleting note:', error);
            setIsDeleting(false);
            return;
        }

        onDelete(note.id);
    }

    async function toggleFavorite() {
        setIsTogglingFav(true);
        const { error } = await supabase
            .from('notes')
            .update({ is_favorite: !note.is_favorite })
            .eq('id', note.id);
        if (error) {
            console.error('Error toggling favorite:', error);
        }
        setIsTogglingFav(false);
    }

    const staggerClass = `stagger-${Math.min(index + 1, 6)}`;

    return (
        <div
            onClick={onClick}
            className={`
                group relative flex flex-col rounded-2xl border border-border/60 bg-card
                hover:border-primary/20 hover:shadow-md
                transition-all duration-300 ease-out overflow-hidden animate-fade-in ${staggerClass}
                ${note.is_favorite ? 'border-amber-400/60 bg-amber-500/[0.02]' : ''}
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
                    <img
                        src={note.image_url}
                        alt={`Attachment for ${note.title}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </div>
            ) : null}

            {/* Body */}
            <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground leading-snug line-clamp-2 flex-1">
                        {note.title}
                    </h3>
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {/* Favorite button */}
                        <button
                            onClick={(e) => {
                                console.log('toggle');
                                e.stopPropagation();
                                void toggleFavorite();
                            }}
                            disabled={isTogglingFav}
                            title={
                                note.is_favorite
                                    ? 'Remove from favorites'
                                    : 'Add to favorites'
                            }
                            className={`
                                p-1.5 rounded-lg transition-all duration-200
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
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* Always show star if favorited even when not hovering */}
                {note.is_favorite && (
                    <div className="absolute top-4 right-4 opacity-100 group-hover:opacity-0 transition-opacity">
                        <Star
                            size={14}
                            className="text-amber-400"
                            fill="currentColor"
                        />
                    </div>
                )}

                {renderedContent && (
                    <div
                        className="
                            mb-3 max-h-[5.25rem] overflow-hidden text-sm leading-relaxed text-muted-foreground
                            [&>*]:mb-2 [&>*:last-child]:mb-0
                            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2
                            [&_blockquote]:border-l-2 [&_blockquote]:border-border/70 [&_blockquote]:pl-3 [&_blockquote]:italic
                            [&_code]:rounded [&_code]:bg-muted/70 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs
                            [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:font-medium
                            [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-hidden [&_pre]:rounded-lg [&_pre]:bg-muted/70 [&_pre]:p-3 [&_pre]:text-xs
                            [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5
                        "
                        dangerouslySetInnerHTML={{ __html: renderedContent }}
                    />
                )}

                {/* No image indicator */}
                {!note.image_url && !renderedContent && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground/50 mb-3">
                        <ImageIcon size={12} />
                        <span>No content</span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground/70">
                    {timeAgo(note.created_at)}
                </span>
                {note.is_favorite && (
                    <span className="text-xs font-medium text-amber-500/80 bg-amber-400/10 px-2 py-0.5 rounded-full">
                        Favorite
                    </span>
                )}
            </div>
        </div>
    );
}
