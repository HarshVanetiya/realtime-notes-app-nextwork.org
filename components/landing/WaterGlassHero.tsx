'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Eye, Share2, MoreHorizontal, Check } from 'lucide-react';
import Reveal from './Reveal';

export default function WaterGlassHero() {
    const [tasks, setTasks] = useState([
        { id: '1', text: 'Take a morning walk by the river', done: true },
        { id: '2', text: 'Finish chapter four of the design book', done: false },
        { id: '3', text: 'Try baking sourdough with rosemary', done: false },
    ]);

    const toggleTask = (id: string) => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        );
    };

    return (
        <section
            id="hero"
            className="pt-32 sm:pt-36 pb-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col items-center text-center relative"
        >
            {/* Top pill badge */}
            <Reveal>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131722]/80 border border-[#00e5ff]/25 shadow-[0_0_15px_rgba(0,229,255,0.12)] text-[#00e5ff] text-xs font-medium font-sans mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                    <span>A calm sanctuary for your words</span>
                </div>
            </Reveal>

            {/* Display Headline */}
            <Reveal delay={80}>
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-3xl">
                    A calm place for{' '}
                    <span className="block mt-1 sm:mt-2 bg-gradient-to-r from-[#00e5ff] via-[#38bdf8] to-[#9cf0ff] bg-clip-text text-transparent filter drop-shadow-[0_0_30px_rgba(0,229,255,0.25)]">
                        all your thoughts.
                    </span>
                </h1>
            </Reveal>

            {/* Subtitle */}
            <Reveal delay={160}>
                <p className="mt-6 text-[#bac9cc] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-normal">
                    A distraction-free notebook that saves automatically and stays in sync across all your devices. Simple, fast, and completely yours.
                </p>
            </Reveal>

            {/* Action CTAs */}
            <Reveal delay={240}>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                    <Link
                        href="/notes"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#00e5ff] hover:bg-[#38bdf8] text-[#090a0f] text-sm font-semibold tracking-wide transition-all shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span>Start writing — it&apos;s free</span>
                        <ArrowRight size={15} />
                    </Link>
                    <a
                        href="#editor-preview"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-[#131722]/70 hover:bg-[#131722] border border-white/[0.12] hover:border-white/[0.25] text-white text-sm font-medium transition-all backdrop-blur-md"
                    >
                        <Eye size={16} className="text-[#849396]" />
                        <span>See preview</span>
                    </a>
                </div>
            </Reveal>

            {/* Interactive Note Window Preview */}
            <div id="editor-preview" className="w-full mt-16 sm:mt-20 scroll-mt-28">
                <Reveal delay={320}>
                    <div className="relative rounded-2xl bg-[#0d0f17] border border-white/[0.08] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8),0_0_32px_rgba(0,229,255,0.06)] overflow-hidden text-left transition-all hover:border-white/[0.15]">
                        {/* Window Chrome / Header */}
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/[0.06] bg-[#121318]/70">
                            {/* Window dots */}
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#343537]" />
                                <span className="w-3 h-3 rounded-full bg-[#343537]" />
                                <span className="w-3 h-3 rounded-full bg-[#343537]" />
                            </div>

                            {/* Centered Status Badge */}
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b1c20] border border-white/[0.06] text-[11px] font-sans text-[#bac9cc]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                                <span className="text-[#00e5ff] font-medium">Saved automatically</span>
                                <span className="text-white/20">·</span>
                                <span>Saturday morning</span>
                            </div>

                            {/* Right Action Icons */}
                            <div className="flex items-center gap-2.5 text-[#849396]">
                                <button
                                    type="button"
                                    aria-label="Share note"
                                    className="p-1 rounded hover:text-white transition-colors"
                                >
                                    <Share2 size={15} />
                                </button>
                                <button
                                    type="button"
                                    aria-label="More options"
                                    className="p-1 rounded hover:text-white transition-colors"
                                >
                                    <MoreHorizontal size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Note Body */}
                        <div className="p-6 sm:p-8 space-y-6">
                            {/* Note Title */}
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                Morning reflections &amp; weekend plans
                            </h2>

                            {/* Note Paragraph */}
                            <p className="text-sm sm:text-base text-[#bac9cc] leading-relaxed font-normal">
                                The quiet before the city wakes up is the best part of the day. Steaming cup of black coffee, gentle breeze through the open window, and completely uninterrupted head space.
                            </p>

                            {/* Interactive Checklist */}
                            <div className="space-y-3 pt-1">
                                {tasks.map((task) => (
                                    <button
                                        key={task.id}
                                        type="button"
                                        onClick={() => toggleTask(task.id)}
                                        className="flex items-center gap-3 w-full text-left group cursor-pointer"
                                    >
                                        <div
                                            className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                                                task.done
                                                    ? 'bg-[#00e5ff] text-[#090a0f]'
                                                    : 'border border-white/25 bg-transparent group-hover:border-[#00e5ff]'
                                            }`}
                                        >
                                            {task.done && <Check size={11} strokeWidth={3.5} />}
                                        </div>
                                        <span
                                            className={`text-xs sm:text-sm transition-colors ${
                                                task.done
                                                    ? 'text-[#64748b] line-through'
                                                    : 'text-[#e3e2e5] group-hover:text-white'
                                            }`}
                                        >
                                            {task.text}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Bottom Tags */}
                            <div className="flex items-center gap-2 pt-2 border-t border-white/[0.05]">
                                <span className="px-2.5 py-1 rounded-md bg-[#131722] border border-white/[0.08] text-[11px] font-mono text-[#bac9cc]">
                                    Journal
                                </span>
                                <span className="px-2.5 py-1 rounded-md bg-[#131722] border border-white/[0.08] text-[11px] font-mono text-[#bac9cc]">
                                    Weekend
                                </span>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
