import Link from 'next/link';
import { Edit3 } from 'lucide-react';
import Reveal from './Reveal';

export default function ClosingCTA() {
    return (
        <section className="relative min-h-[560px] sm:min-h-[640px] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-20 sm:py-28 border-b border-white/[0.08] overflow-hidden">
            {/* Moody Slate Granite Image Asset Overlay */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    alt="Minimalist tactile notebook on slate surface"
                    className="w-full h-full object-cover object-center opacity-25 filter grayscale contrast-125 brightness-75"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDso4aH0LiLB4tV3WWj5D20R1kvh-LJsVMLd-ZG2M9lClP_I1vVYn74bavjRek5uoK8NMKMx1vuUdHDTdX_Gfn244FElZC8hzeQISeduQ-PnuC15NvSdfmiqX1CFQznqegb1xYgX6rXQeq6xwreIbK2OII1pU2B7wwZZemGjKOmVT-qXOH7rwG6A5qcjTcJ8MQmz-MK8A12RHau54ai9XWkZPF7u3AkcRNfTaY3o4RLVlHotpbHCghf"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e10] via-[#0d0e10]/80 to-[#0d0e10]/40" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(13,14,16,0.95)_75%)]" />
            </div>

            {/* Foreground Kinetic CTA Container */}
            <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
                <Reveal>
                    <div className="w-12 h-12 rounded-xl bg-[#1b1c1e]/80 border border-[#00e5ff]/30 flex items-center justify-center text-[#00e5ff] mb-6 sm:mb-8 backdrop-blur-md shadow-[0_0_20px_rgba(0,229,255,0.2)]">
                        <Edit3 size={22} />
                    </div>
                </Reveal>

                <Reveal delay={80}>
                    <h2 className="text-3xl sm:text-5xl lg:text-7xl font-black text-white font-sans tracking-tight leading-tight">
                        Open a blank page
                        <span className="text-[#00e5ff]">.</span>
                    </h2>
                </Reveal>

                <Reveal delay={160}>
                    <p className="mt-5 sm:mt-6 text-sm sm:text-lg md:text-xl text-[#bac9cc] font-sans font-light max-w-xl leading-relaxed">
                        No setup, no credit card, no clutter. Your thoughts,
                        saved immediately.
                    </p>
                </Reveal>

                <Reveal delay={240}>
                    <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 w-full sm:w-auto">
                        <Link
                            href="/notes"
                            className="magnetic-sweep-btn w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-[#00e5ff] text-[#00363d] font-mono text-xs sm:text-sm font-black tracking-widest uppercase shadow-[0_0_40px_rgba(0,229,255,0.35)] hover:shadow-[0_0_60px_rgba(0,229,255,0.6)] hover:brightness-105 transition-all text-center"
                        >
                            Start writing now — free
                        </Link>
                        <span className="font-mono text-[11px] sm:text-xs text-[#849396] tracking-wider text-center">
                            Works offline immediately · Sign in optional to sync
                        </span>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}
