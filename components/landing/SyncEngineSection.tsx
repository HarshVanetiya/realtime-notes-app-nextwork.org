'use client';

import { useState, useEffect } from 'react';
import { Laptop, Smartphone, Lock } from 'lucide-react';
import Reveal from './Reveal';

const PHRASE =
    'Everything converges in real-time across edge nodes with zero conflict.';

export default function SyncEngineSection() {
    const [sourceText, setSourceText] = useState('');
    const [targetText, setTargetText] = useState('');

    // Typing simulation loop across both devices
    useEffect(() => {
        let isMounted = true;
        let charIdx = 0;
        let isDeleting = false;
        let timer: NodeJS.Timeout;

        function runTypingLoop() {
            if (!isMounted) return;

            if (!isDeleting && charIdx <= PHRASE.length) {
                const currentSource = PHRASE.slice(0, charIdx);
                setSourceText(currentSource + (charIdx < PHRASE.length ? '█' : ''));

                // Target updates with a tiny realistic delta lag (100ms)
                setTimeout(() => {
                    if (isMounted) {
                        const targetLen = Math.max(0, charIdx - 2);
                        setTargetText(
                            PHRASE.slice(0, targetLen) +
                                (charIdx < PHRASE.length ? '█' : '')
                        );
                    }
                }, 100);

                charIdx++;
                timer = setTimeout(runTypingLoop, 60);
            } else if (!isDeleting && charIdx > PHRASE.length) {
                isDeleting = true;
                timer = setTimeout(runTypingLoop, 2400);
            } else if (isDeleting && charIdx > 0) {
                charIdx -= 2;
                const current = PHRASE.slice(0, Math.max(0, charIdx));
                setSourceText(current);
                setTargetText(current);
                timer = setTimeout(runTypingLoop, 25);
            } else {
                isDeleting = false;
                charIdx = 0;
                timer = setTimeout(runTypingLoop, 600);
            }
        }

        timer = setTimeout(runTypingLoop, 400);

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, []);

    return (
        <section
            id="live-sync"
            className="py-20 sm:py-28 px-4 sm:px-6 lg:px-12 border-b border-white/[0.08] bg-[#121315]/40 relative overflow-hidden"
        >
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                {/* Left Side: Editorial Core */}
                <div className="lg:col-span-5 space-y-6">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-mono text-xs uppercase tracking-widest w-fit">
                            <span>01 // Engine</span>
                        </div>
                    </Reveal>

                    <Reveal delay={80}>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white font-sans leading-tight">
                            Live everywhere.{' '}
                            <span className="text-[#00e5ff]">
                                Edits converge
                            </span>{' '}
                            before your finger leaves the key.
                        </h2>
                    </Reveal>

                    <Reveal delay={160}>
                        <p className="text-sm sm:text-base text-[#bac9cc] font-sans leading-relaxed">
                            Edits, stars, and deletions sync across devices in
                            under a second. No manual refresh, no merge conflict
                            dialogues, no lost paragraphs.
                        </p>
                    </Reveal>

                    <Reveal delay={240}>
                        <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-xs text-[#849396]">
                            <div className="px-3 py-2 rounded-lg bg-[#1b1c1e] border border-white/[0.08] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                                <span className="text-white">
                                    CRDT Delta Sync
                                </span>
                            </div>
                            <div className="px-3 py-2 rounded-lg bg-[#1b1c1e] border border-white/[0.08] flex items-center gap-2">
                                <Lock size={14} className="text-[#d0bcff]" />
                                <span>E2E Ephemeral Stream</span>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* Right Side: Interactive Two-Device Sync Simulation */}
                <div className="lg:col-span-7">
                    <Reveal delay={120}>
                        <div className="rounded-2xl bg-[#0d0e10] border border-white/[0.12] p-5 sm:p-7 shadow-2xl relative overflow-hidden">
                            {/* Top replication status bar */}
                            <div className="flex items-center justify-between pb-4 sm:pb-5 border-b border-white/[0.08] font-mono text-xs">
                                <span className="text-[#849396] uppercase tracking-widest text-[11px] sm:text-xs">
                                    Active Replication Topology
                                </span>
                                <div className="flex items-center gap-2 text-[#00e5ff]">
                                    <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-ping" />
                                    <span className="font-semibold text-[11px] sm:text-xs">
                                        18ms Roundtrip
                                    </span>
                                </div>
                            </div>

                            {/* Dual Device Grid */}
                            <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-11 gap-4 sm:gap-6 items-center">
                                {/* Device 1: MacBook Pro (5 cols) */}
                                <div className="md:col-span-5 rounded-xl bg-[#1b1c1e]/70 border border-white/[0.1] p-4 font-mono text-xs">
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] text-[10px]">
                                        <div className="flex items-center gap-1.5 text-white">
                                            <Laptop
                                                size={14}
                                                className="text-[#00e5ff]"
                                            />
                                            <span className="font-semibold">
                                                MacBook Pro 16&quot;
                                            </span>
                                        </div>
                                        <span className="text-[#00e5ff]">
                                            Push · 14:02:11.204
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <div className="text-white font-bold font-sans text-sm">
                                            # Launch readiness
                                        </div>
                                        <p className="text-[#bac9cc] font-sans text-xs min-h-[48px] leading-relaxed break-words font-mono">
                                            {sourceText}
                                        </p>
                                        <div className="pt-2 flex items-center gap-1.5 text-[10px] text-[#849396] border-t border-white/[0.08]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                                            <span>Local keystroke ack: 1ms</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Interconnect: Fiber Link with Racing Pulse */}
                                {/* Desktop: horizontal (1 col) */}
                                <div className="hidden md:flex md:col-span-1 flex-col items-center justify-center relative py-2">
                                    <svg
                                        className="w-full h-8 overflow-visible"
                                        fill="none"
                                        viewBox="0 0 100 20"
                                        aria-hidden
                                    >
                                        <line
                                            x1="0"
                                            y1="10"
                                            x2="100"
                                            y2="10"
                                            stroke="rgba(59, 73, 76, 0.5)"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                        />
                                        <circle
                                            className="fiber-packet"
                                            cx="10"
                                            cy="10"
                                            r="3.5"
                                            fill="#00e5ff"
                                        />
                                    </svg>
                                    <span className="text-[9px] font-mono text-[#00e5ff] uppercase mt-1 tracking-wider">
                                        CRDT
                                    </span>
                                </div>

                                {/* Mobile: vertical interconnect link */}
                                <div className="flex md:hidden flex-col items-center justify-center py-2 relative">
                                    <svg
                                        className="h-10 w-6 overflow-visible"
                                        fill="none"
                                        viewBox="0 0 20 40"
                                        aria-hidden
                                    >
                                        <line
                                            x1="10"
                                            y1="0"
                                            x2="100"
                                            y2="40"
                                            stroke="rgba(59, 73, 76, 0.5)"
                                            strokeWidth="2"
                                            strokeDasharray="4 4"
                                        />
                                        <circle
                                            className="fiber-packet-vertical"
                                            cx="10"
                                            cy="5"
                                            r="3.5"
                                            fill="#00e5ff"
                                        />
                                    </svg>
                                    <span className="text-[9px] font-mono text-[#00e5ff] uppercase tracking-wider">
                                        CRDT SYNC
                                    </span>
                                </div>

                                {/* Device 2: Mobile Client (5 cols) */}
                                <div className="md:col-span-5 rounded-xl bg-[#1b1c1e]/70 border border-white/[0.1] p-4 font-mono text-xs">
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08] text-[10px]">
                                        <div className="flex items-center gap-1.5 text-white">
                                            <Smartphone
                                                size={14}
                                                className="text-[#d0bcff]"
                                            />
                                            <span className="font-semibold">
                                                iPhone 16 Pro
                                            </span>
                                        </div>
                                        <span className="text-[#849396]">
                                            Ack · 14:02:11.222
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <div className="text-white font-bold font-sans text-sm">
                                            # Launch readiness
                                        </div>
                                        <p className="text-[#bac9cc] font-sans text-xs min-h-[48px] leading-relaxed break-words font-mono">
                                            {targetText}
                                        </p>
                                        <div className="pt-2 flex items-center gap-1.5 text-[10px] text-[#d0bcff] border-t border-white/[0.08]">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#d0bcff]" />
                                            <span>Mirror state: verified</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Telemetry Bar */}
                            <div className="mt-6 sm:mt-8 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono text-[#849396]">
                                <span>P2P mesh fallback enabled</span>
                                <span className="text-white">
                                    Zero merge-conflict state machine
                                </span>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
