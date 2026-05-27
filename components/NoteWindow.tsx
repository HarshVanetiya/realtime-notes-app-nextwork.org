'use client';

import { Rnd } from 'react-rnd';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Square, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WindowState } from './NotesList';
import NoteRenderer from './NoteRenderer';

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
                    className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/10 bg-[#14213d]/70 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                    {/* Window Header (Drag Handle) */}
                    <div className="window-drag-handle flex flex-shrink-0 cursor-grab items-center justify-between border-b border-white/10 bg-black/20 px-3 py-2 active:cursor-grabbing">
                        {/* macOS style traffic lights */}
                        <div className="flex w-[60px] items-center gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeWindow(window.id);
                                }}
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
                                className="group flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 hover:bg-green-600"
                            >
                                <Square
                                    size={8}
                                    className="text-black/50 opacity-0 group-hover:opacity-100"
                                />
                            </button>
                        </div>
                        {/* Title and App Icon */}
                        <div className="flex select-none items-center gap-2 truncate px-4 text-xs font-semibold text-[#e5e5e5]">
                            {window.note.image_url && (
                                <img
                                    src={window.note.image_url}
                                    alt="App Icon"
                                    className="h-5 w-5 rounded object-cover shadow-sm ring-1 ring-white/20"
                                />
                            )}
                            <span>{window.note.title}</span>
                        </div>
                        <div className="w-[60px]"></div>{' '}
                        {/* Spacer to balance flex-between */}
                    </div>

                    {/* Window Content */}
                    <div className="custom-scrollbar flex-1 cursor-text overflow-y-auto">
                        <div className="flex h-full w-full justify-center pt-4">
                            <NoteRenderer content={window.note.content} />
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </Rnd>
    );
}
