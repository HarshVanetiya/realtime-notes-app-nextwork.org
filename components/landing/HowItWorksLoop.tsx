import { Terminal, Tag, Zap } from 'lucide-react';
import Reveal from './Reveal';

export default function HowItWorksLoop() {
    return (
        <section
            id="how-it-works"
            aria-labelledby="loop-heading"
            className="py-24 sm:py-32 px-4 sm:px-6 lg:px-12 border-b border-white/[0.08] bg-[#121315]/40 relative overflow-hidden"
        >
            <div className="max-w-[1500px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 sm:mb-20 pb-6 border-b border-white/[0.08]">
                    <Reveal>
                        <div className="font-mono text-xs uppercase tracking-widest text-[#00e5ff] mb-3">
                            03 // Execution Loop
                        </div>
                        <h2
                            id="loop-heading"
                            className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-sans tracking-tight"
                        >
                            A frictionless 3-step loop.
                        </h2>
                    </Reveal>
                    <Reveal delay={80}>
                        <p className="mt-4 md:mt-0 font-sans text-sm sm:text-base text-[#bac9cc] max-w-sm leading-relaxed">
                            Designed to minimize the distance between thinking
                            something and storing it forever.
                        </p>
                    </Reveal>
                </div>

                {/* Continuous Flow Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 relative">
                    {/* Continuous SVG Laser Trail traversing behind all 3 steps (Desktop) */}
                    <div
                        aria-hidden
                        className="hidden lg:block absolute top-1/2 -translate-y-8 left-0 right-0 pointer-events-none z-0"
                    >
                        <svg
                            className="w-full h-12"
                            preserveAspectRatio="none"
                            viewBox="0 0 1200 40"
                        >
                            <path
                                className="animate-dash-flow"
                                d="M 50,20 L 1150,20"
                                stroke="rgba(0, 229, 255, 0.25)"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>

                    {/* Step 1 */}
                    <Reveal delay={0} className="relative z-10 h-full">
                        <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-[#0d0e10]/90 border border-white/[0.1] backdrop-blur-xl flex flex-col justify-between overflow-hidden group hover:border-[#00e5ff]/40 transition-colors">
                            {/* Giant Ghost Numeral Watermark */}
                            <span
                                aria-hidden
                                className="absolute -bottom-8 -right-2 text-[120px] sm:text-[150px] font-black font-mono text-white/[0.03] pointer-events-none select-none"
                            >
                                01
                            </span>

                            <div>
                                <div className="flex items-center justify-between font-mono text-xs text-[#00e5ff] mb-6">
                                    <span className="font-semibold tracking-wider">
                                        PHASE // CAPTURE
                                    </span>
                                    <Terminal size={18} />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                                    Write it down
                                </h3>
                                <p className="mt-3 text-xs sm:text-sm text-[#bac9cc] font-sans leading-relaxed">
                                    Slash commands, pure markdown speed, instant
                                    zero-latency keystroke capture without login
                                    barriers.
                                </p>
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-[#849396]">
                                <span>Zero spin-up</span>
                                <span className="text-[#00e5ff] font-semibold">
                                    &lt; 0.1ms render
                                </span>
                            </div>
                        </div>
                    </Reveal>

                    {/* Step 2 */}
                    <Reveal delay={90} className="relative z-10 h-full">
                        <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-[#0d0e10]/90 border border-white/[0.1] backdrop-blur-xl flex flex-col justify-between overflow-hidden group hover:border-[#d0bcff]/40 transition-colors">
                            {/* Giant Ghost Numeral Watermark */}
                            <span
                                aria-hidden
                                className="absolute -bottom-8 -right-2 text-[120px] sm:text-[150px] font-black font-mono text-white/[0.03] pointer-events-none select-none"
                            >
                                02
                            </span>

                            <div>
                                <div className="flex items-center justify-between font-mono text-xs text-[#d0bcff] mb-6">
                                    <span className="font-semibold tracking-wider">
                                        PHASE // INDEX
                                    </span>
                                    <Tag size={18} />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                                    Tag it once
                                </h3>
                                <p className="mt-3 text-xs sm:text-sm text-[#bac9cc] font-sans leading-relaxed">
                                    Categorize with a single keystroke. Tags act
                                    as fluid dynamic smart views without rigid
                                    folder nesting.
                                </p>
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-[#849396]">
                                <span>Smart filters</span>
                                <span className="text-[#d0bcff] font-semibold">
                                    Instant grouping
                                </span>
                            </div>
                        </div>
                    </Reveal>

                    {/* Step 3 */}
                    <Reveal delay={180} className="relative z-10 h-full">
                        <div className="relative h-full p-6 sm:p-8 rounded-2xl bg-[#0d0e10]/90 border border-white/[0.1] backdrop-blur-xl flex flex-col justify-between overflow-hidden group hover:border-[#00e5ff]/40 transition-colors">
                            {/* Giant Ghost Numeral Watermark */}
                            <span
                                aria-hidden
                                className="absolute -bottom-8 -right-2 text-[120px] sm:text-[150px] font-black font-mono text-white/[0.03] pointer-events-none select-none"
                            >
                                03
                            </span>

                            <div>
                                <div className="flex items-center justify-between font-mono text-xs text-[#00e5ff] mb-6">
                                    <span className="font-semibold tracking-wider">
                                        PHASE // RETRIEVE
                                    </span>
                                    <Zap size={18} />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white font-sans">
                                    Find it instantly
                                </h3>
                                <p className="mt-3 text-xs sm:text-sm text-[#bac9cc] font-sans leading-relaxed">
                                    Instant ⌘K fuzzy full-text lookup across
                                    thousands of notes in milliseconds. Never
                                    file a document manually again.
                                </p>
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-[#849396]">
                                <span>Local index</span>
                                <span className="text-[#00e5ff] font-semibold">
                                    Fuzzy search
                                </span>
                            </div>
                        </div>
                    </Reveal>
                </div>
            </div>
        </section>
    );
}
