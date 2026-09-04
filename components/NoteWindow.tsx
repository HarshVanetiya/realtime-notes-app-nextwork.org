'use client';

import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WindowState } from './NotesList';
import NoteRenderer from './NoteRenderer';
import EditNoteModal from './EditNoteModal';

interface NoteWindowProps {
    window: WindowState;
    updateWindow: (id: string, updates: Partial<WindowState>) => void;
    closeWindow: (id: string) => void;
    bringToFront: (id: string) => void;
}

export default function NoteWindow({
    window,
    updateWindow,
    closeWindow,
    bringToFront,
}: NoteWindowProps) {
    const router = useRouter();

    if (window.isMinimized) return null;

    return (
        <Rnd
            default={{
                x: (window.id.charCodeAt(0) % 50) + 100, // Slight offset based on ID so windows don't stack perfectly
                y: (window.id.charCodeAt(1) % 50) + 100,
                width: 450,
                height: 500,
            }}
            minWidth={300}
            minHeight={250}
            bounds="window"
            onMouseDown={() => bringToFront(window.id)}
            dragHandleClassName="window-drag-handle"
            style={{ zIndex: window.zIndex }}
            // We remove the visual styling from Rnd itself and put it on the motion.div
            className="overflow-visible rounded-xl"
        >
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background/90 shadow-xl backdrop-blur-2xl"
                >
                    {/* Window Header (Drag Handle) */}
                    <div className="window-drag-handle flex flex-shrink-0 cursor-grab items-center justify-between border-b border-border/50 bg-muted/50 px-3 py-2 active:cursor-grabbing">
                        {/* macOS style traffic lights */}
                        <div className="flex w-[60px] items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeWindow(window.id);
                                }}
                                title="Close"
                                aria-label="Close window"
                                className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 hover:bg-red-600"
                            >
                                <X
                                    size={10}
                                    className="text-black/50 opacity-0 group-hover:opacity-100"
                                />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateWindow(window.id, {
                                        isMinimized: true,
                                    });
                                }}
                                title="Minimize"
                                aria-label="Minimize window"
                                className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-yellow-500 hover:bg-yellow-600"
                            >
                                <Minus
                                    size={10}
                                    className="text-black/50 opacity-0 group-hover:opacity-100"
                                />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/notes/${window.note.id}`);
                                }}
                                title="Open full page"
                                aria-label="Open full page"
                                className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 hover:bg-green-600"
                            >
                                <Square
                                    size={8}
                                    className="text-black/50 opacity-0 group-hover:opacity-100"
                                />
                            </button>
                        </div>
                        {/* Title and App Icon */}
                        <div className="flex min-w-0 flex-1 select-none items-center justify-center gap-2 px-4 text-xs font-semibold text-foreground">
                            {window.note.image_url && (
                                <img
                                    src={window.note.image_url}
                                    alt=""
                                    className="h-5 w-5 flex-shrink-0 rounded object-cover shadow-sm ring-1 ring-border"
                                />
                            )}
                            <span className="truncate">{window.note.title}</span>
                        </div>
                        {/* Actions */}
                        <div className="flex w-[60px] justify-end items-center gap-2 pr-1">
                            <EditNoteModal initialData={window.note}>
                                <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-foreground/10" title="Edit Note">
                                    <Pencil size={13} />
                                </button>
                            </EditNoteModal>
                        </div>
                    </div>

                    {/* Window Content */}
                    <div className="custom-scrollbar flex-1 cursor-text overflow-y-auto">
                        <div className="flex h-full w-full min-w-0 justify-center px-4 pt-4 [&_*]:break-words">
                            <NoteRenderer content={window.note.content} />
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </Rnd>
    );
}
