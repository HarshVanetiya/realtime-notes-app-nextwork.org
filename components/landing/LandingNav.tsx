'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

interface LandingNavProps {
    isSignedIn: boolean;
    isSynced?: boolean;
    onToggleSync?: () => void;
}

export default function LandingNav({
    isSignedIn,
    isSynced: externalSynced,
    onToggleSync,
}: LandingNavProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [internalSynced, setInternalSynced] = useState(true);

    const isSynced = externalSynced !== undefined ? externalSynced : internalSynced;

    const handleToggle = () => {
        if (onToggleSync) {
            onToggleSync();
        } else {
            setInternalSynced((prev) => !prev);
            window.dispatchEvent(new CustomEvent('prism:sync-toggle'));
        }
    };

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) {
                setMobileOpen(false);
            }
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 px-4 sm:px-6 lg:px-12 py-3.5 transition-all duration-300 ${
                scrolled || mobileOpen
                    ? 'border-b border-white/[0.08] bg-[#0d0e10]/90 backdrop-blur-2xl shadow-lg shadow-black/40'
                    : 'border-b border-white/[0.05] bg-[#0d0e10]/60 backdrop-blur-md'
            }`}
        >
            <div className="max-w-[1500px] mx-auto flex items-center justify-between">
                {/* Logo + Brand ID */}
                <Link
                    href="/"
                    className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] rounded"
                    aria-label="Prism Home"
                >
                    <div className="w-8 h-8 rounded-md overflow-hidden bg-white/[0.04] border border-white/[0.12] flex items-center justify-center p-1 transition-transform group-hover:scale-105 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
                        <svg
                            className="w-full h-full"
                            fill="none"
                            viewBox="0 0 40 40"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                        >
                            <defs>
                                <linearGradient
                                    id="prismGlowNav"
                                    x1="4"
                                    x2="36"
                                    y1="4"
                                    y2="36"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop offset="0%" stopColor="#00E5FF" />
                                    <stop offset="100%" stopColor="#8B5CF6" />
                                </linearGradient>
                                <linearGradient
                                    id="prismFacetNav"
                                    x1="20"
                                    x2="32"
                                    y1="6"
                                    y2="32"
                                    gradientUnits="userSpaceOnUse"
                                >
                                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.1" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points="20,6 34,31 6,31"
                                fill="rgba(14, 15, 17, 0.6)"
                                stroke="url(#prismGlowNav)"
                                strokeWidth="2"
                                strokeLinejoin="round"
                            />
                            <polygon
                                points="20,6 20,31 34,31"
                                fill="url(#prismFacetNav)"
                            />
                            <line
                                x1="20"
                                y1="6"
                                x2="20"
                                y2="31"
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth="1.2"
                                strokeDasharray="1 1"
                            />
                            <circle cx="20" cy="6" r="2.5" fill="#00E5FF" />
                            <circle cx="6" cy="31" r="2" fill="#8B5CF6" />
                            <circle cx="34" cy="31" r="2" fill="#00E5FF" />
                        </svg>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="font-bold tracking-tight text-lg text-white font-sans">
                            Prism
                        </span>
                        <span className="text-[10px] uppercase font-mono tracking-widest text-[#849396] border border-white/[0.08] px-1.5 py-0.2 rounded bg-white/[0.02]">
                            v2.4
                        </span>
                    </div>
                </Link>

                {/* Center Minimal Rail (Desktop) */}
                <nav
                    aria-label="Section Navigation"
                    className="hidden lg:flex items-center gap-7 font-mono text-xs text-[#bac9cc] tracking-wider"
                >
                    <a
                        href="#hero"
                        className="hover:text-[#00e5ff] transition-colors uppercase py-1"
                    >
                        00 // Canvas
                    </a>
                    <a
                        href="#live-sync"
                        className="hover:text-[#00e5ff] transition-colors uppercase py-1"
                    >
                        01 // Engine
                    </a>
                    <a
                        href="#what-it-does"
                        className="hover:text-[#00e5ff] transition-colors uppercase py-1"
                    >
                        02 // Specs
                    </a>
                    <a
                        href="#how-it-works"
                        className="hover:text-[#00e5ff] transition-colors uppercase py-1"
                    >
                        03 // Loop
                    </a>
                </nav>

                {/* Right Telemetry & Actions */}
                <div className="flex items-center gap-2.5 sm:gap-4">
                    {/* Interactive State Trigger Pill */}
                    <button
                        type="button"
                        onClick={handleToggle}
                        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-md bg-[#1b1c1e] border border-white/[0.08] text-xs font-mono transition-all hover:border-[#00e5ff]/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff]"
                        title="Toggle simulated connection state"
                        id="sync-state-toggle"
                    >
                        <span
                            className={`w-2 h-2 rounded-full ${
                                isSynced
                                    ? 'bg-[#00e5ff] animate-ping'
                                    : 'bg-[#d0bcff]'
                            }`}
                        />
                        <span
                            className={`font-semibold tracking-wide text-[11px] sm:text-xs ${
                                isSynced ? 'text-[#00e5ff]' : 'text-[#d0bcff]'
                            }`}
                        >
                            {isSynced ? 'SYNCED · 2ms' : 'OFFLINE · 0ms'}
                        </span>
                    </button>

                    {/* Auth links (Desktop) */}
                    <div className="hidden sm:flex items-center gap-2">
                        {isSignedIn ? (
                            <Link
                                href="/notes"
                                className="magnetic-sweep-btn px-4 py-2 bg-[#00e5ff] text-[#00363d] font-mono text-xs font-bold tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all"
                            >
                                Open Prism
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/auth/login"
                                    className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#bac9cc] hover:text-white transition-colors"
                                >
                                    Sign In
                                </Link>
                                <Link
                                    href="/notes"
                                    className="magnetic-sweep-btn px-4 py-2 bg-[#00e5ff] text-[#00363d] font-mono text-xs font-bold tracking-wider uppercase hover:brightness-110 shadow-[0_0_20px_rgba(0,229,255,0.25)] transition-all"
                                >
                                    Start writing
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 rounded-md bg-[#1b1c1e] border border-white/[0.08] text-[#bac9cc] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-[#00e5ff]"
                        aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
                        aria-expanded={mobileOpen}
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer Menu */}
            {mobileOpen && (
                <div className="lg:hidden mt-3 pt-4 pb-3 border-t border-white/[0.08] bg-[#0d0e10]/95 backdrop-blur-xl animate-fade-in">
                    <nav className="flex flex-col gap-2 font-mono text-xs tracking-wider text-[#bac9cc] px-2">
                        <a
                            href="#hero"
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2.5 rounded-md hover:bg-white/[0.04] hover:text-[#00e5ff] uppercase"
                        >
                            00 // Canvas
                        </a>
                        <a
                            href="#live-sync"
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2.5 rounded-md hover:bg-white/[0.04] hover:text-[#00e5ff] uppercase"
                        >
                            01 // Engine
                        </a>
                        <a
                            href="#what-it-does"
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2.5 rounded-md hover:bg-white/[0.04] hover:text-[#00e5ff] uppercase"
                        >
                            02 // Specs
                        </a>
                        <a
                            href="#how-it-works"
                            onClick={() => setMobileOpen(false)}
                            className="px-3 py-2.5 rounded-md hover:bg-white/[0.04] hover:text-[#00e5ff] uppercase"
                        >
                            03 // Loop
                        </a>

                        <div className="pt-3 mt-1 border-t border-white/[0.08] flex flex-col gap-2">
                            {isSignedIn ? (
                                <Link
                                    href="/notes"
                                    onClick={() => setMobileOpen(false)}
                                    className="magnetic-sweep-btn w-full text-center py-3 bg-[#00e5ff] text-[#00363d] font-mono text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                                >
                                    Open Prism
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/notes"
                                        onClick={() => setMobileOpen(false)}
                                        className="magnetic-sweep-btn w-full text-center py-3 bg-[#00e5ff] text-[#00363d] font-mono text-xs font-bold tracking-wider uppercase shadow-[0_0_20px_rgba(0,229,255,0.25)]"
                                    >
                                        Start writing
                                    </Link>
                                    <Link
                                        href="/auth/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="w-full text-center py-2.5 rounded-md border border-white/[0.1] text-xs font-mono uppercase tracking-wider text-[#bac9cc] hover:text-white"
                                    >
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
