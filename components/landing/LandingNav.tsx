'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import PrismMark from '@/components/PrismMark';

/**
 * Transparent over the hero, then frosted once the page scrolls under it —
 * the bar has to stay legible over whatever colour the aurora has drifted to.
 *
 * The scroll listener is passive: without that flag the browser must wait to
 * see whether the handler calls preventDefault before it can scroll, which is
 * exactly the stutter this page is trying to avoid.
 *
 * `backdrop-blur-md` rather than `-xl`, with a more opaque background to make
 * up the difference. backdrop-filter is re-evaluated on every frame the
 * element is composited, and this one is fixed over a scrolling page, so it is
 * composited constantly — halving the radius is free legibility.
 */
export default function LandingNav({ isSignedIn }: { isSignedIn: boolean }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <header
            className={`fixed inset-x-0 top-0 z-50 transition-colors duration-base ease-standard ${
                scrolled
                    ? 'border-b border-border/50 bg-background/85 backdrop-blur-md'
                    : 'border-b border-transparent'
            }`}
        >
            <nav
                aria-label="Main"
                className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5 sm:px-8"
            >
                <Link
                    href="/"
                    className="flex items-center gap-2.5 rounded-lg font-semibold tracking-tight text-foreground"
                >
                    <PrismMark size={26} idSuffix="nav" />
                    Prism
                </Link>

                <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
                    <Link
                        href="#features"
                        className="hidden rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
                    >
                        Features
                    </Link>
                    {isSignedIn ? (
                        <Link
                            href="/notes"
                            className="bg-spectrum sheen rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[hsl(var(--spectrum-violet))]/25 transition-transform duration-fast ease-spring hover:scale-[1.03]"
                        >
                            Open Prism
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/auth/login"
                                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                            >
                                Sign in
                            </Link>
                            <Link
                                href="/auth/sign-up"
                                className="bg-spectrum sheen rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[hsl(var(--spectrum-violet))]/25 transition-transform duration-fast ease-spring hover:scale-[1.03]"
                            >
                                Start writing
                            </Link>
                        </>
                    )}
                </div>
            </nav>
        </header>
    );
}
