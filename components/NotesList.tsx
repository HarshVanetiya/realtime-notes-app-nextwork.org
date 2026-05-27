'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import NoteCard from './NoteCard';
import { BookOpen, Star } from 'lucide-react';
import Link from 'next/link';
import NoteWindow from './NoteWindow';

// At the top of NotesList.tsx
export type WindowState = {
    id: string; // usually note.id
    note: Note;
    isMinimized: boolean;
    isMaximized: boolean;
    zIndex: number;
};

type Note = {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    created_at: string;
};

type FilterType = 'all' | 'favorites';

export default function NotesList({
    initialNotes,
    userId,
}: {
    initialNotes: Note[];
    userId: string;
}) {
    const [filter, setFilter] = useState<FilterType>('all');
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const supabase = createClient();

    const [windows, setWindows] = useState<WindowState[]>([]);
    const [topZIndex, setTopZIndex] = useState(10); // To keep track of the active window

    // Inside NotesList.tsx, add these helper functions
    function updateWindow(id: string, updates: Partial<WindowState>) {
        setWindows((current) =>
            current.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        );
    }

    function closeWindow(id: string) {
        setWindows((current) => current.filter((w) => w.id !== id));
    }

    function bringToFront(id: string) {
        setTopZIndex((z) => z + 1);
        updateWindow(id, { zIndex: topZIndex + 1 });
    }

    // Function to open a note
    function openWindow(note: Note) {
        setWindows((current) => {
            // If already open, just bring to front and unminimize
            const existing = current.find((w) => w.id === note.id);
            if (existing) {
                return current.map((w) =>
                    w.id === note.id
                        ? { ...w, zIndex: topZIndex + 1, isMinimized: false }
                        : w,
                );
            }
            // Otherwise, open a new window
            return [
                ...current,
                {
                    id: note.id,
                    note,
                    isMinimized: false,
                    isMaximized: false,
                    zIndex: topZIndex + 1,
                },
            ];
        });
        setTopZIndex((z) => z + 1);
    }

    const displayedNotes =
        filter === 'favorites'
            ? notes.filter((note) => note.is_favorite)
            : notes;

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

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    function handleDelete(id: string) {
        setNotes((current) => current.filter((note) => note.id !== id));
    }

    const tabs: {
        id: FilterType;
        label: string;
        icon: React.ElementType;
        count?: number;
    }[] = [
        { id: 'all', label: 'All Notes', icon: BookOpen, count: notes.length },
        {
            id: 'favorites',
            label: 'Favorites',
            icon: Star,
            count: notes.filter((n) => n.is_favorite).length,
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit mb-6">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = filter === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                                transition-all duration-200
                                ${
                                    active
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }
                            `}
                        >
                            <Icon
                                size={14}
                                className={active ? 'text-primary' : ''}
                            />
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span
                                    className={`
                                    text-xs px-1.5 py-0.5 rounded-full font-medium
                                    ${
                                        active
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-muted text-muted-foreground'
                                    }
                                `}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Notes grid */}
            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-muted/60 flex items-center justify-center mb-6">
                        <BookOpen
                            size={36}
                            className="text-muted-foreground/40"
                        />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No notes yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Start capturing your thoughts, ideas, and anything worth
                        remembering.
                    </p>
                    <Link
                        href="/notes/create"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                    >
                        Create your first note
                    </Link>
                </div>
            ) : displayedNotes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-amber-400/10 flex items-center justify-center mb-6">
                        <Star size={36} className="text-amber-400/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                        No favorites yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                        Star a note to add it to your favorites for quick
                        access.
                    </p>
                    <button
                        onClick={() => setFilter('all')}
                        className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                        View all notes
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {displayedNotes.map((note, index) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            onDelete={handleDelete}
                            index={index}
                            onClick={() => openWindow(note)} // Add this prop
                        />
                    ))}
                </div>
            )}

            {/* Render Windows */}
            {windows.map((window) => (
                <NoteWindow
                    key={window.id}
                    window={window}
                    updateWindow={updateWindow}
                    closeWindow={closeWindow}
                    bringToFront={bringToFront}
                />
            ))}

            {/* macOS Style Dock for Minimized Windows (Bottom of NotesList.tsx) */}
            {windows.some((w) => w.isMinimized) && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-3 p-2.5 rounded-2xl bg-background/80 backdrop-blur-lg border border-border/50 shadow-lg z-50">
                    {windows
                        .filter((w) => w.isMinimized)
                        .map((w) => (
                            <button
                                key={w.id}
                                onClick={() =>
                                    updateWindow(w.id, {
                                        isMinimized: false,
                                        zIndex: topZIndex + 1,
                                    })
                                }
                                className="group relative w-12 h-12 rounded-xl border border-border/50 flex items-center justify-center hover:-translate-y-2 hover:scale-110 transition-all duration-300 shadow-md overflow-hidden bg-card"
                            >
                                {w.note.image_url ? (
                                    <img
                                        src={w.note.image_url}
                                        alt={w.note.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <BookOpen
                                        size={20}
                                        className="text-primary/70 group-hover:text-primary transition-colors"
                                    />
                                )}

                                {/* Tooltip on hover */}
                                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                    {w.note.title}
                                </span>
                            </button>
                        ))}
                </div>
            )}
        </div>
    );
}
