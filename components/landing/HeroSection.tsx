'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Compass, Terminal } from 'lucide-react';
import Reveal from './Reveal';

export default function HeroSection() {
    const cardRef = useRef<HTMLDivElement>(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    // Subtle 3D tilt effect on desktop
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (window.innerWidth < 1024) return;
            const xPercent = e.clientX / window.innerWidth - 0.5;
            const yPercent = e.clientY / window.innerHeight - 0.5;
            setTilt({ x: xPercent * 6, y: -yPercent * 6 });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <section
            id="hero"
            className="min-h-screen pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-12 flex flex-col justify-center border-b border-white/[0.08] relative overflow-hidden"
        >
            {/* Ambient radial lighting flares */}
            <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[550px] rounded-full opacity-60"
                style={{
                    background:
                        'radial-gradient(ellipse at center, rgba(0, 229, 255, 0.12) 0%, rgba(139, 92, 246, 0.08) 40%, transparent 70%)',
                }}
            />

            <div className="max-w-[1500px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                {/* Left 60%: Colossal Editorial Headline & Telemetry */}
                <div className="lg:col-span-7 flex flex-col justify-center text-left pr-0 lg:pr-6 z-10">
                    <Reveal>
                        <div className="inline-flex items-center gap-2 font-mono text-xs tracking-widest uppercase text-[#849396] mb-6 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] inline-block animate-pulse" />
                            <span>Realtime · Offline-first · Shareable</span>
                        </div>
                    </Reveal>

                    <Reveal delay={80}>
                        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-black tracking-[-0.035em] leading-[1.0] text-white uppercase font-sans">
                            Notes at the <br />
                            <span className="bg-gradient-to-r from-[#00e5ff] via-white to-[#d0bcff] bg-clip-text text-transparent">
                                speed
                            </span>{' '}
                            of thought.
                        </h1>
                    </Reveal>

                    <Reveal delay={160}>
                        <p className="mt-6 sm:mt-8 font-sans text-base sm:text-lg md:text-xl text-[#bac9cc] max-w-xl leading-relaxed font-light">
                            Notes that sync the instant you type, keep writing
                            when you&apos;re offline, and turn into a single
                            shareable link.
                        </p>
                    </Reveal>

                    <Reveal delay={240}>
                        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                            <Link
                                href="/notes"
                                className="magnetic-sweep-btn inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#00e5ff] text-[#00363d] font-mono text-xs sm:text-sm font-bold tracking-wider uppercase shadow-[0_0_35px_rgba(0,229,255,0.35)] hover:shadow-[0_0_50px_rgba(0,229,255,0.6)] hover:brightness-105 transition-all text-center"
                            >
                                <span>Start writing</span>
                                <ArrowRight size={16} />
                            </Link>
                            <a
                                href="#what-it-does"
                                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-md bg-[#1b1c1e]/80 border border-white/[0.1] text-white font-mono text-xs uppercase tracking-wider hover:bg-white/[0.06] transition-all text-center"
                            >
                                <Compass size={16} className="text-[#00e5ff]" />
                                <span>See what it does</span>
                            </a>
                        </div>
                    </Reveal>

                    <Reveal delay={300}>
                        <div className="mt-10 sm:mt-12 flex flex-wrap items-center gap-3 sm:gap-6 font-mono text-xs text-[#849396] border-t border-white/[0.08] pt-6">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                                <span className="text-white font-medium">
                                    Local-first IndexedDB
                                </span>
                            </div>
                            <span className="hidden sm:inline text-white/20">•</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[#00e5ff] font-semibold">
                                    Zero schema
                                </span>
                                <span>markdown core</span>
                            </div>
                        </div>
                    </Reveal>
                </div>

                {/* Right 40%: Floating Spatial Glass Notebook */}
                <div className="lg:col-span-5 relative lg:translate-x-4 z-10">
                    <Reveal delay={200}>
                        {/* Ambient glow behind card */}
                        <div
                            aria-hidden
                            className="absolute -inset-4 bg-gradient-to-tr from-[#00e5ff]/20 to-[#8b5cf6]/20 blur-3xl opacity-50 pointer-events-none"
                        />

                        {/* 3D Mockup Container */}
                        <div
                            ref={cardRef}
                            style={{
                                transform: `perspective(1000px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg)`,
                                transition: 'transform 0.15s ease-out',
                            }}
                            className="relative rounded-2xl bg-[#0d0e10]/95 border border-white/[0.12] shadow-[0_30px_90px_rgba(0,0,0,0.85)] overflow-hidden backdrop-blur-xl"
                        >
                            {/* Mock Window Header */}
                            <div className="h-11 px-4 bg-[#1b1c1e]/80 border-b border-white/[0.08] flex items-center justify-between font-mono text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                                    <span className="ml-2 text-[#849396] text-[11px] truncate">
                                        prism://canvas/active
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] font-mono whitespace-nowrap">
                                        2ms ACK
                                    </span>
                                </div>
                            </div>

                            {/* Mock Window Content */}
                            <div className="p-5 sm:p-6 space-y-5">
                                <div className="flex items-center justify-between text-[#849396] font-mono text-[11px] pb-3 border-b border-white/[0.08]">
                                    <span className="text-[#00e5ff]">
                                        #code / architecture.md
                                    </span>
                                    <span>UTF-8 · 428 words</span>
                                </div>

                                <div className="space-y-3 font-mono text-xs sm:text-sm leading-relaxed">
                                    <h2 className="text-white font-bold text-base sm:text-lg font-sans">
                                        # Offline-first architecture
                                    </h2>
                                    <p className="text-[#bac9cc] font-sans text-xs sm:text-sm">
                                        Changes queue locally via IndexedDB and
                                        replay with zero conflicts. Type without
                                        signal.
                                    </p>

                                    {/* Simulated code mutation block */}
                                    <div className="p-3.5 rounded-lg bg-[#1f2022]/70 border border-white/[0.08] font-mono text-xs text-[#00e5ff] flex items-start gap-2.5 overflow-x-auto">
                                        <Terminal
                                            size={16}
                                            className="text-[#00e5ff] shrink-0 mt-0.5"
                                        />
                                        <div className="leading-relaxed font-mono">
                                            <span className="text-white">
                                                mutations.append(&#123;
                                            </span>
                                            <br />
                                            <span className="pl-3 text-[#d0bcff]">
                                                op: &quot;insert_block&quot;,
                                            </span>
                                            <br />
                                            <span className="pl-3 text-[#00e5ff]">
                                                crdt_clock: 140211,
                                            </span>
                                            <br />
                                            <span className="pl-3 text-[#849396]">
                                                state: &quot;synced_live&quot;
                                            </span>
                                            <br />
                                            <span className="text-white">&#125;)</span>
                                            <span className="inline-block w-2 h-3.5 bg-[#00e5ff] ml-1 animate-pulse align-middle" />
                                        </div>
                                    </div>
                                </div>

                                {/* Slash Menu Preview */}
                                <div className="p-3 rounded-lg bg-[#1f2022]/60 border border-white/[0.08] flex items-center justify-between font-mono text-xs text-[#bac9cc]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[#00e5ff] font-bold">
                                            /
                                        </span>
                                        <span className="text-white">
                                            code block
                                        </span>
                                        <span className="text-[#849396] text-[10px] ml-1 hidden sm:inline">
                                            enter to summon
                                        </span>
                                    </div>
                                    <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] text-[#849396]">
                                        ESC
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
