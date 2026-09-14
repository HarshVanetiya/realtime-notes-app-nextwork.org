import PrismMark from '@/components/PrismMark';

export default function LandingFooter() {
    return (
        <footer className="w-full bg-[#0d0e10] border-t border-white/[0.08] py-8 sm:py-10 px-4 sm:px-6 lg:px-12 font-mono text-xs text-[#849396] relative z-10">
            <div className="max-w-[1500px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Logo and Core Mission */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="w-6 h-6 rounded bg-white/[0.05] border border-white/[0.1] flex items-center justify-center p-0.5 shadow-[0_0_10px_rgba(0,229,255,0.15)]">
                        <PrismMark size={20} idSuffix="footer" />
                    </div>
                    <span className="text-white font-semibold font-sans">
                        Prism — a realtime notebook
                    </span>
                    <span className="text-white/20">•</span>
                    <span>Built with Next.js and Supabase</span>
                </div>

                {/* Right: Real-Time Network Telemetry */}
                <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 sm:gap-6 text-center">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
                        <span className="text-white tracking-wider uppercase text-[10px] sm:text-[11px]">
                            ALL SYSTEMS LIVE · SYNC P99 42MS
                        </span>
                    </div>
                    <span className="hidden sm:inline text-white/20">•</span>
                    <span className="text-[11px]">© 2026 Prism</span>
                </div>
            </div>
        </footer>
    );
}
