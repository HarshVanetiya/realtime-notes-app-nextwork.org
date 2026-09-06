'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, RotateCcw, Loader2, Trash } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-provider';
import { extractPlainText } from '@/lib/note-text';
import type { Note } from '@/lib/note-types';

function trashedAgo(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days < 1) return 'Trashed today';
    if (days === 1) return 'Trashed yesterday';
    return `Trashed ${days} days ago`;
}

export default function TrashList({ initialNotes }: { initialNotes: Note[] }) {
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [busy, setBusy] = useState<string | null>(null);
    const supabase = createClient();
    const toast = useToast();
    const router = useRouter();

    async function restore(note: Note) {
        setBusy(note.id);
        const { error } = await supabase
            .from('notes')
            .update({ deleted_at: null })
            .eq('id', note.id);
        setBusy(null);
        if (error) {
            toast.error('Could not restore note', { description: error.message });
            return;
        }
        setNotes((c) => c.filter((n) => n.id !== note.id));
        toast.success('Note restored', { description: note.title });
        router.refresh();
    }

    // The only genuinely destructive action left in the app, so it keeps a
    // confirmation — there is nowhere to undo from after this.
    async function purge(note: Note) {
        setBusy(note.id);
        const { error } = await supabase.from('notes').delete().eq('id', note.id);
        setBusy(null);
        if (error) {
            toast.error('Could not delete note', { description: error.message });
            return;
        }
        setNotes((c) => c.filter((n) => n.id !== note.id));
        toast.success('Note deleted permanently', { description: note.title });
    }

    if (notes.length === 0) {
        return (
            <div className="mt-4 flex flex-col items-center justify-center rounded-3xl border border-border/50 bg-card/60 px-6 py-16 text-center sm:py-24">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/50 bg-foreground/5 sm:h-20 sm:w-20">
                    <Trash size={36} className="text-muted-foreground" />
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                    Trash is empty
                </h2>
                <p className="max-w-xs text-sm text-muted-foreground">
                    Deleted notes wait here so you can change your mind.
                </p>
            </div>
        );
    }

    return (
        <ul className="grid grid-cols-1 gap-4 pb-32 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => {
                const preview = extractPlainText(note.content);
                return (
                    <li
                        key={note.id}
                        className="flex flex-col rounded-2xl border border-border/60 bg-card/70 p-4"
                    >
                        <h2 className="mb-1 break-words font-semibold text-foreground [overflow-wrap:anywhere]">
                            {note.title}
                        </h2>
                        {preview && (
                            <p className="mb-3 line-clamp-2 break-words text-sm text-muted-foreground [overflow-wrap:anywhere]">
                                {preview}
                            </p>
                        )}
                        <p className="mb-4 mt-auto text-xs text-muted-foreground">
                            {trashedAgo(note.deleted_at)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => void restore(note)}
                                disabled={busy === note.id}
                                className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors duration-fast ease-standard hover:border-primary/40 disabled:opacity-50"
                            >
                                {busy === note.id ? (
                                    <Loader2 size={14} className="animate-spin" />
                                ) : (
                                    <RotateCcw size={14} />
                                )}
                                Restore
                            </button>
                            <button
                                onClick={() => void purge(note)}
                                disabled={busy === note.id}
                                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-destructive transition-colors duration-fast ease-standard hover:bg-destructive/10 disabled:opacity-50"
                            >
                                <Trash2 size={14} />
                                Delete forever
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
