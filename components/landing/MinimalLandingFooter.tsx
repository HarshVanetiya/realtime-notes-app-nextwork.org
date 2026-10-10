export default function MinimalLandingFooter() {
    return (
        <footer className="border-t border-white/[0.06] py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[#849396]">
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
                <span className="text-[#bac9cc]">Peaceful notes for creative thinkers</span>
            </div>

            <div className="text-center sm:text-right text-[#64748b]">
                <span>Prism Notes © 2026 — Simple, fast, yours</span>
            </div>
        </footer>
    );
}
