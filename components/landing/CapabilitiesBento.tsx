'use client';

import { useState } from 'react';
import {
    CloudOff,
    Search,
    Globe,
    FileEdit,
    Tag,
    Trash2,
} from 'lucide-react';
import Reveal from './Reveal';

export default function CapabilitiesBento() {
    const [isPublished, setIsPublished] = useState(true);
    const [undoState, setUndoState] = useState<'idle' | 'restored'>('idle');

    const handleUndo = () => {
        setUndoState('restored');
        setTimeout(() => {
            setUndoState('idle');
        }, 1800);
    };

    return (
        <section
            id="what-it-does"
            aria-labelledby="capabilities-heading"
            className="py-20 sm:py-28 px-4 sm:px-6 lg:px-12 border-b border-white/[0.08] bg-[#0d0e10]"
        >
            <div className="max-w-[1500px] mx-auto">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 sm:mb-16 pb-6 border-b border-white/[0.08]">
                    <Reveal>
                        <div className="font-mono text-xs uppercase tracking-widest text-[#00e5ff] mb-3">
                            02 // Capabilities
                        </div>
                        <h2
                            id="capabilities-heading"
                            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-sans tracking-tight"
                        >
                            Crafted for people who think in text.
                        </h2>
                    </Reveal>
                    <Reveal delay={80}>
                        <p className="mt-4 md:mt-0 font-sans text-sm sm:text-base text-[#bac9cc] max-w-sm leading-relaxed">
                            Every interaction is trimmed down to its essential
                            physics. No bloatware. No database schemas.
                        </p>
                    </Reveal>
                </div>

                {/* Asymmetric Bento Grid: 2 Large Hero Bento + 4 Modular Bento */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* BENTO TILE 1 (6-col): Offline-first Interactive Engine */}
                    <div className="md:col-span-12 lg:col-span-6">
                        <Reveal className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-6 sm:p-8 flex flex-col justify-between h-full hover:border-[#d0bcff]/40 transition-colors group">
                                <div>
                                    <div className="w-10 h-10 rounded-lg bg-[#571bc1]/20 border border-[#d0bcff]/30 flex items-center justify-center text-[#d0bcff] mb-6 shadow-[0_0_15px_rgba(208,188,255,0.15)]">
                                        <CloudOff size={20} />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                                        Offline-first
                                    </h3>
                                    <p className="mt-2 text-xs sm:text-sm text-[#bac9cc] font-sans leading-relaxed">
                                        Writing keeps working with zero signal.
                                        Local mutation queue replays cleanly the
                                        instant you reconnect.
                                    </p>
                                </div>

                                {/* Interactive Queue Visualizer */}
                                <div className="mt-6 sm:mt-8 p-4 rounded-xl bg-[#0d0e10] border border-white/[0.08] font-mono text-xs">
                                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#ffb4ab] animate-pulse" />
                                            <span className="text-white text-[11px] sm:text-xs">
                                                No Internet Connection
                                            </span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#571bc1]/30 border border-[#d0bcff]/30 text-[#d0bcff]">
                                            3 queued
                                        </span>
                                    </div>
                                    <div className="mt-3 space-y-2 text-[11px] text-[#849396]">
                                        <div className="flex justify-between items-center text-[#bac9cc]">
                                            <span className="truncate pr-2">
                                                op[0]: update_paragraph
                                                (&quot;Hydration test...&quot;)
                                            </span>
                                            <span className="text-[#d0bcff] font-mono text-[10px] shrink-0">
                                                queued
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[#bac9cc]">
                                            <span className="truncate pr-2">
                                                op[1]: add_tag
                                                (&quot;#baking&quot;)
                                            </span>
                                            <span className="text-[#d0bcff] font-mono text-[10px] shrink-0">
                                                queued
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-[#bac9cc]">
                                            <span className="truncate pr-2">
                                                op[2]: set_star (true)
                                            </span>
                                            <span className="text-[#d0bcff] font-mono text-[10px] shrink-0">
                                                queued
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* BENTO TILE 2 (6-col): ⌘K Command Search HUD */}
                    <div className="md:col-span-12 lg:col-span-6">
                        <Reveal delay={80} className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-6 sm:p-8 flex flex-col justify-between h-full hover:border-[#00e5ff]/40 transition-colors group">
                                <div>
                                    <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff] mb-6 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                                        <Search size={20} />
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                                        ⌘K Command Search
                                    </h3>
                                    <p className="mt-2 text-xs sm:text-sm text-[#bac9cc] font-sans leading-relaxed">
                                        One shortcut searches full note bodies,
                                        jumps to tags, and escalates to instant
                                        text queries.
                                    </p>
                                </div>

                                {/* Spatial HUD Search Bar Modal */}
                                <div className="mt-6 sm:mt-8 p-4 rounded-xl bg-[#0d0e10] border border-white/[0.08] font-mono text-xs">
                                    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1f2022] border border-white/[0.1]">
                                        <Search
                                            size={15}
                                            className="text-[#00e5ff]"
                                        />
                                        <span className="text-white font-mono text-xs">
                                            hydration test
                                        </span>
                                        <span className="ml-auto text-[10px] px-2 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[#849396]">
                                            ESC
                                        </span>
                                    </div>
                                    <div className="mt-3 divide-y divide-white/[0.08] text-[11px]">
                                        <div className="py-2 flex items-center justify-between text-[#00e5ff]">
                                            <span className="truncate pr-2">
                                                Sourdough hydration experiments
                                                (78% vs 82%)
                                            </span>
                                            <span className="text-[#849396] font-mono text-[10px] shrink-0">
                                                #baking
                                            </span>
                                        </div>
                                        <div className="py-2 flex items-center justify-between text-[#bac9cc]">
                                            <span className="truncate pr-2">
                                                VisionOS glass token specs
                                            </span>
                                            <span className="text-[#849396] font-mono text-[10px] shrink-0">
                                                #work
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* BENTO TILE 3 (3-col): One-link Publishing */}
                    <div className="md:col-span-6 lg:col-span-3">
                        <Reveal delay={120} className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-5 sm:p-6 flex flex-col justify-between h-full hover:border-[#00e5ff]/30 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center text-[#00e5ff] mb-4">
                                        <Globe size={18} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white font-sans">
                                        One-link publishing
                                    </h4>
                                    <p className="mt-2 text-xs text-[#bac9cc] font-sans leading-relaxed">
                                        Any single note can be flipped into a
                                        revocable public link, without exposing
                                        your account or notebook.
                                    </p>
                                </div>
                                <div className="mt-6 p-3 rounded-lg bg-[#0d0e10] border border-white/[0.08] font-mono text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-white font-sans text-xs">
                                            Public Link
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsPublished(!isPublished)
                                            }
                                            className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors ${
                                                isPublished
                                                    ? 'justify-end bg-[#00e5ff]'
                                                    : 'justify-start bg-white/20'
                                            }`}
                                            aria-label="Toggle public link"
                                        >
                                            <div className="w-3 h-3 rounded-full bg-[#0d0e10] shadow" />
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-[#00e5ff] truncate">
                                        {isPublished
                                            ? 'prism.new/p/c92-v4'
                                            : 'Link disabled'}
                                    </div>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* BENTO TILE 4 (3-col): Minimal Editor */}
                    <div className="md:col-span-6 lg:col-span-3">
                        <Reveal delay={160} className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-5 sm:p-6 flex flex-col justify-between h-full hover:border-[#d0bcff]/30 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-[#571bc1]/20 border border-[#d0bcff]/20 flex items-center justify-center text-[#d0bcff] mb-4">
                                        <FileEdit size={18} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white font-sans">
                                        Minimal Editor
                                    </h4>
                                    <p className="mt-2 text-xs text-[#bac9cc] font-sans leading-relaxed">
                                        Headings, lists, code blocks, images via
                                        slash menu. Nothing visible until
                                        summoned.
                                    </p>
                                </div>
                                <div className="mt-6 p-3 rounded-lg bg-[#0d0e10] border border-white/[0.08] font-mono text-[11px] flex items-center justify-between text-[#849396]">
                                    <span className="text-[#00e5ff]">/code</span>
                                    <span>·</span>
                                    <span className="text-[#d0bcff]">
                                        /quote
                                    </span>
                                    <span>·</span>
                                    <span className="text-white">/table</span>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* BENTO TILE 5 (3-col): Tagging */}
                    <div className="md:col-span-6 lg:col-span-3">
                        <Reveal delay={200} className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-5 sm:p-6 flex flex-col justify-between h-full hover:border-[#00e5ff]/30 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/10 border border-[#00e5ff]/20 flex items-center justify-center text-[#00e5ff] mb-4">
                                        <Tag size={18} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white font-sans">
                                        Tagging
                                    </h4>
                                    <p className="mt-2 text-xs text-[#bac9cc] font-sans leading-relaxed">
                                        Lightweight tags (#work, #code) that
                                        behave as fast filters, not rigid folder
                                        hierarchies.
                                    </p>
                                </div>
                                <div className="mt-6 flex flex-wrap gap-1.5 font-mono text-[10px]">
                                    <span className="px-2 py-1 rounded bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30">
                                        #work
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white/[0.05] text-[#bac9cc] border border-white/[0.08]">
                                        #baking
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white/[0.05] text-[#bac9cc] border border-white/[0.08]">
                                        #code
                                    </span>
                                    <span className="px-2 py-1 rounded bg-white/[0.05] text-[#bac9cc] border border-white/[0.08]">
                                        #personal
                                    </span>
                                </div>
                            </div>
                        </Reveal>
                    </div>

                    {/* BENTO TILE 6 (3-col): Non-destructive Delete */}
                    <div className="md:col-span-6 lg:col-span-3">
                        <Reveal delay={240} className="h-full">
                            <div className="rounded-2xl bg-[#1b1c1e]/40 border border-white/[0.1] p-5 sm:p-6 flex flex-col justify-between h-full hover:border-[#ffb4ab]/30 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-[#93000a]/30 border border-[#ffb4ab]/30 flex items-center justify-center text-[#ffb4ab] mb-4">
                                        <Trash2 size={18} />
                                    </div>
                                    <h4 className="text-base sm:text-lg font-bold text-white font-sans">
                                        Non-destructive Delete
                                    </h4>
                                    <p className="mt-2 text-xs text-[#bac9cc] font-sans leading-relaxed">
                                        Deleting is one tap, always undoable via
                                        Trash. Nothing is deleted in anger or
                                        lost.
                                    </p>
                                </div>
                                <div className="mt-6 p-3 rounded-lg bg-[#0d0e10] border border-white/[0.08] flex items-center justify-between font-mono text-[11px]">
                                    <span className="text-[#bac9cc] truncate pr-2">
                                        &quot;Quarterly retros&quot;
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleUndo}
                                        className={`px-2.5 py-1 rounded font-bold text-[10px] tracking-wider uppercase transition-all shrink-0 ${
                                            undoState === 'restored'
                                                ? 'bg-[#d0bcff] text-[#3c0091]'
                                                : 'bg-[#00e5ff] text-[#00363d] hover:brightness-110'
                                        }`}
                                    >
                                        {undoState === 'restored'
                                            ? 'RESTORED'
                                            : 'Undo'}
                                    </button>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    );
}
