'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import NoteCard from './NoteCard';

type Note = {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    created_at: string;
};

export default function NotesList({
    initialNotes,
    userId,
}: {
    initialNotes: Note[];
    userId: string;
}) {
    const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const supabase = createClient();

    const displayedNotes = showFavoritesOnly
        ? notes.filter((note) => note.is_favorite)
        : notes;

    useEffect(() => {
        // Open a real-time channel filtered to this user's notes
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

        // Clean up the channel when the component unmounts
        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    function handleDelete(id: string) {
        setNotes((current) => current.filter((note) => note.id !== id));
    }

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div>
                <button
                    onClick={() => {
                        setShowFavoritesOnly(false);
                    }}
                    className={`${!showFavoritesOnly && 'text-yellow-300'}`}
                >
                    All Notes
                </button>
                <button
                    onClick={() => {
                        setShowFavoritesOnly(true);
                    }}
                    className={`${showFavoritesOnly && 'text-yellow-300'}`}
                >
                    Favorites Only
                </button>
            </div>
            {notes.length === 0 ? (
                <p className="col-span-2 py-8 text-center text-gray-500">
                    No notes yet. Create your first note above!
                </p>
            ) : (
                displayedNotes.map((note) => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        onDelete={handleDelete}
                    />
                ))
            )}
        </div>
    );
}
