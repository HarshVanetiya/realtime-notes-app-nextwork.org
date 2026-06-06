'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import NoteCard from './NoteCard';
import { BookOpen, Star, Search, Plus } from 'lucide-react';
import NoteWindow from './NoteWindow';
import CreateNoteModal from './CreateNoteModal';

import { useSearchParams, useRouter } from 'next/navigation';

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

export default function NotesList({
    initialNotes,
    userId,
}: {
    initialNotes: Note[];
    userId: string;
}) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const isFavoritesView = searchParams.get('filter') === 'favorites';
    
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
        isFavoritesView
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

    return (
        <>
            {/* Notes grid */}
            <div className="animate-fade-in">
                {notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-background/50 backdrop-blur-sm border border-border/40 rounded-3xl mt-4">
                        <div className="w-20 h-20 rounded-3xl bg-foreground/5 border border-border/50 shadow-sm flex items-center justify-center mb-6">
                            <BookOpen
                                size={36}
                                className="text-muted-foreground"
                            />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No notes yet
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                            Start capturing your thoughts, ideas, and anything worth
                            remembering.
                        </p>
                        <CreateNoteModal>
                            <button
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                            >
                                Create your first note
                            </button>
                        </CreateNoteModal>
                    </div>
                ) : displayedNotes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-background/50 backdrop-blur-sm border border-border/40 rounded-3xl mt-4">
                        <div className="w-20 h-20 rounded-3xl bg-foreground/5 border border-border/50 shadow-sm flex items-center justify-center mb-6">
                            <Star size={36} className="text-amber-400/80" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No favorites yet
                        </h3>
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
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-32">
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
            </div>

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

            {/* Floating Bottom Navigation Islands */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-50 animate-in slide-in-from-bottom-12 duration-700 fade-in ease-out-back">
                {/* Search Capsule (Island 1) */}
                <div className="group flex items-center gap-3 px-6 h-14 bg-white/5 dark:bg-white/5 backdrop-blur-2xl border border-border/50 dark:border-white/10 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:shadow-primary/20 hover:border-primary/40 focus-within:border-primary/60 focus-within:shadow-primary/30 focus-within:bg-white/10 dark:focus-within:bg-white/10 transition-all duration-500 w-[280px] sm:w-[380px] md:w-[460px] overflow-hidden relative">
                    {/* Animated shine effect on hover */}
                    <div className="absolute top-0 -left-[100%] h-full w-1/2 z-0 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white/10 opacity-0 group-hover:opacity-100 group-hover:animate-[shine_1.5s_ease-in-out_infinite] pointer-events-none"></div>
                    <style>{`
                        @keyframes shine {
                            0% { transform: translateX(0) skewX(-12deg); }
                            100% { transform: translateX(400%) skewX(-12deg); }
                        }
                    `}</style>
                    
                    <Search size={20} className="text-muted-foreground group-focus-within:text-primary group-hover:scale-110 transition-all duration-300 flex-shrink-0 relative z-10" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        className="bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0 h-full relative z-10"
                    />
                </div>

                {/* Create Note Button (Island 2) */}
                <CreateNoteModal>
                    <button className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.15] hover:-translate-y-1 active:scale-95 transition-all duration-400 overflow-hidden">
                        {/* Inner glow on hover */}
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full blur-sm"></div>
                        <Plus size={26} className="stroke-[2.5] relative z-10 group-hover:rotate-90 transition-transform duration-500 ease-in-out" />
                    </button>
                </CreateNoteModal>

                {/* Minimized Windows (Island 3+) */}
                {windows.some((w) => w.isMinimized) && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
                        {/* Divider */}
                        <div className="w-px h-8 bg-border/80 mx-1 rounded-full"></div>
                        
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
                                    className="group relative w-14 h-14 rounded-full border border-border/60 flex items-center justify-center hover:-translate-y-2 hover:scale-110 transition-all duration-300 shadow-xl overflow-hidden bg-background/80 backdrop-blur-xl animate-in zoom-in-50 fade-in"
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
                                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground/90 backdrop-blur-sm text-background text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap shadow-lg">
                                        {w.note.title}
                                    </span>
                                </button>
                            ))}
                    </div>
                )}
            </div>
        </>
    );
}
