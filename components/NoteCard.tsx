'use client';

import { createClient } from '@/lib/supabase/client';

type Note = {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    created_at: string;
};

export default function NoteCard({
    note,
    onDelete,
}: {
    note: Note;
    onDelete: (id: string) => void;
}) {
    const supabase = createClient();

    async function handleDelete() {
        const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', note.id);
        if (error) {
            console.error('Error deleting note:', error);
        }
    }

    async function toggleFavorite() {
        console.log('hello');
        const { error } = await supabase
            .from('notes')
            .update({ is_favorite: !note.is_favorite })
            .eq('id', note.id);
        if (error) {
            console.error('Error deleting note:', error);
        }
    }

    return (
        <div
            className={`rounded-lg border bg-white p-4 shadow-sm ${note.is_favorite && 'border-yellow-400 bg-yellow-100'}`}
        >
            <div className="mb-2 flex items-start justify-between">
                <h3 className="text-lg font-semibold">{note.title}</h3>
                <button
                    onClick={handleDelete}
                    className="text-sm text-red-500 hover:text-red-700"
                >
                    Delete
                </button>
                <button
                    onClick={toggleFavorite}
                    className="text-sm text-red-500 hover:text-red-700"
                >
                    ★
                </button>
            </div>
            {note.content && (
                <p className="mb-3 text-gray-600">{note.content}</p>
            )}
            {note.image_url && (
                <img
                    src={note.image_url}
                    alt={`Attachment for ${note.title}`}
                    className="mb-3 max-h-64 w-full rounded object-cover"
                />
            )}
            <p className="text-xs text-gray-400">
                {new Date(note.created_at).toLocaleDateString()}
            </p>
        </div>
    );
}
