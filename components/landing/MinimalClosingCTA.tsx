'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

export default function MinimalClosingCTA() {
    return (
        <section id="about" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-20">
            <Reveal>
                <div className="relative rounded-3xl p-10 sm:p-14 text-center overflow-hidden border border-white/[0.08] bg-gradient-to-b from-[#131722]/90 via-[#0d0f17] to-[#090a0f] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.8),0_0_40px_rgba(0,229,255,0.08)]">
                    {/* Atmospheric diffuse glow behind the card */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-40 blur-3xl"
                        style={{
                            background:
                                'radial-gradient(circle, rgba(0, 229, 255, 0.25) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 80%)',
                        }}
                    />

                    <div className="relative z-10 max-w-xl mx-auto space-y-4">
                        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                            Ready for a quieter mind?
                        </h2>
                        <p className="text-[#bac9cc] text-sm sm:text-base leading-relaxed">
                            No sign-up secrets course or subscriptions. Just open the page and write what&apos;s on your mind.
                        </p>
                        <div className="pt-4 flex justify-center">
                            <Link
                                href="/notes"
                                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#00e5ff] hover:bg-[#38bdf8] text-[#090a0f] text-sm font-semibold tracking-wide transition-all shadow-[0_0_25px_rgba(0,229,255,0.4)] hover:shadow-[0_0_35px_rgba(0,229,255,0.6)] hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span>Open Prism</span>
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            </Reveal>
        </section>
    );
}
