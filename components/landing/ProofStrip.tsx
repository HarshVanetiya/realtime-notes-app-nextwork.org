import { Zap, WifiOff, Link as LinkIcon } from 'lucide-react';
import Reveal from './Reveal';

export default function ProofStrip() {
    return (
        <section
            aria-label="Latency and Resilience Benchmarks"
            className="border-b border-white/[0.08] bg-[#0d0e10] py-0"
        >
            <div className="max-w-[1500px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/[0.08] font-mono">
                {/* Stat 1 */}
                <Reveal delay={0}>
                    <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-between h-full group hover:bg-white/[0.02] transition-colors">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-[#849396] flex items-center justify-between mb-4">
                                <span>Latency benchmark</span>
                                <Zap size={16} className="text-[#00e5ff]" />
                            </div>
                            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#00e5ff] tracking-tight">
                                &lt;42ms
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/[0.08]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                                Under a second
                            </h3>
                            <p className="font-sans text-xs sm:text-sm text-[#bac9cc] mt-1.5 leading-relaxed">
                                Cross-device sync without delays. Edits converge
                                live between phones, tablets, and laptops without
                                merge conflicts.
                            </p>
                        </div>
                    </div>
                </Reveal>

                {/* Stat 2 */}
                <Reveal delay={80}>
                    <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-between h-full group hover:bg-white/[0.02] transition-colors">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-[#849396] flex items-center justify-between mb-4">
                                <span>Offline resilience</span>
                                <WifiOff size={16} className="text-[#d0bcff]" />
                            </div>
                            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#d0bcff] tracking-tight">
                                0 BARS
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/[0.08]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                                Zero bars
                            </h3>
                            <p className="font-sans text-xs sm:text-sm text-[#bac9cc] mt-1.5 leading-relaxed">
                                Write on subways, flights, or remote cabins. A
                                local mutation queue stores every keystroke and
                                replays cleanly on reconnect.
                            </p>
                        </div>
                    </div>
                </Reveal>

                {/* Stat 3 */}
                <Reveal delay={160}>
                    <div className="p-6 sm:p-8 lg:p-12 flex flex-col justify-between h-full group hover:bg-white/[0.02] transition-colors">
                        <div>
                            <div className="text-xs uppercase tracking-widest text-[#849396] flex items-center justify-between mb-4">
                                <span>Anonymous broadcast</span>
                                <LinkIcon size={16} className="text-[#c7f4ff]" />
                            </div>
                            <div className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#c7f4ff] tracking-tight">
                                1 LINK
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-white/[0.08]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white font-sans">
                                One link
                            </h3>
                            <p className="font-sans text-xs sm:text-sm text-[#bac9cc] mt-1.5 leading-relaxed">
                                Publish any single note to an unguessable web
                                link instantly. Revoke access with one switch
                                without exposing your identity.
                            </p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
