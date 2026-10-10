'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import PrismMark from '@/components/PrismMark';

interface WaterGlassNavProps {
    isSignedIn: boolean;
}

export default function WaterGlassNav({ isSignedIn }: WaterGlassNavProps) {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header className="fixed inset-x-0 top-5 z-50 flex justify-center px-4 pointer-events-none">
            {/* Floating Water Glass Island Pill */}
            <div
                className={`pointer-events-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all duration-300 border ${
                    scrolled
                        ? 'bg-[#0d0f17]/90 border-white/[0.14] shadow-[0_16px_40px_-10px_rgba(0,0,0,0.8),0_0_25px_rgba(0,229,255,0.12)] backdrop-blur-2xl'
                        : 'bg-[#131722]/75 border-white/[0.1] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.6),0_0_16px_rgba(0,229,255,0.06)] backdrop-blur-xl'
                }`}
            >
                {/* Brand Logo & Name (Maintaining official PrismMark) */}
                <Link
                    href="/"
                    className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] rounded-full pr-1"
                    aria-label="Prism Home"
                >
                    <div className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.12] flex items-center justify-center p-0.5 transition-transform group-hover:scale-105 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
                        <PrismMark size={22} idSuffix="water-glass" />
                    </div>
                    <span className="font-bold tracking-tight text-sm text-white font-sans">
                        Prism
                    </span>
                </Link>

                {/* Center Navigation Links (Desktop) */}
                <nav
                    aria-label="Main Navigation"
                    className="hidden md:flex items-center gap-6 font-sans text-xs font-medium text-[#bac9cc]"
                >
                    <a
                        href="#hero"
                        className="hover:text-white hover:text-shadow transition-colors py-1"
                    >
                        Home
                    </a>
                    <a
                        href="#features"
                        className="hover:text-white hover:text-shadow transition-colors py-1"
                    >
                        Features
                    </a>
                    <a
                        href="#about"
                        className="hover:text-white hover:text-shadow transition-colors py-1"
                    >
                        About
                    </a>
                </nav>

                {/* Right Action CTA Button */}
                <div className="flex items-center gap-2">
                    <Link
                        href={isSignedIn ? '/notes' : '/notes'}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full bg-[#00e5ff] hover:bg-[#38bdf8] text-[#090a0f] text-xs font-bold font-sans tracking-wide transition-all shadow-[0_0_16px_rgba(0,229,255,0.35)] hover:shadow-[0_0_24px_rgba(0,229,255,0.55)] hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <span>{isSignedIn ? 'Open Prism' : 'Start writing'}</span>
                    </Link>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        aria-label="Toggle navigation menu"
                        className="md:hidden text-[#bac9cc] hover:text-white p-1 rounded-full hover:bg-white/[0.08] transition-colors focus:outline-none"
                    >
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Panel */}
            {mobileOpen && (
                <div className="pointer-events-auto absolute top-16 inset-x-4 max-w-sm mx-auto p-4 rounded-2xl bg-[#0d0f17]/95 border border-white/[0.12] shadow-2xl backdrop-blur-2xl flex flex-col gap-3 font-sans text-sm md:hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <a
                        href="#hero"
                        onClick={() => setMobileOpen(false)}
                        className="text-[#bac9cc] hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                        Home
                    </a>
                    <a
                        href="#features"
                        onClick={() => setMobileOpen(false)}
                        className="text-[#bac9cc] hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                        Features
                    </a>
                    <a
                        href="#about"
                        onClick={() => setMobileOpen(false)}
                        className="text-[#bac9cc] hover:text-white px-3 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                        About
                    </a>
                    <div className="pt-2 border-t border-white/[0.08] flex justify-between items-center px-1">
                        <Link
                            href="/auth"
                            onClick={() => setMobileOpen(false)}
                            className="text-xs text-[#bac9cc] hover:text-[#00e5ff] font-medium"
                        >
                            {isSignedIn ? 'Account' : 'Sign in'}
                        </Link>
                        <Link
                            href="/notes"
                            onClick={() => setMobileOpen(false)}
                            className="text-xs px-3 py-1.5 rounded-full bg-[#00e5ff] text-[#090a0f] font-semibold"
                        >
                            Open notes →
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
