import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import Aurora from '@/components/landing/Aurora';
import LandingNav from '@/components/landing/LandingNav';
import AppPreview from '@/components/landing/AppPreview';
import FeatureBento from '@/components/landing/FeatureBento';
import Reveal from '@/components/landing/Reveal';
import Tilt from '@/components/landing/Tilt';
import AmbientWash from '@/components/AmbientWash';
import PrismMark from '@/components/PrismMark';

export const metadata = {
    title: 'Prism — notes at the speed of thought',
    description:
        'A realtime notebook that syncs the instant you type, keeps writing when you are offline, and publishes a single note with a link.',
    openGraph: {
        title: 'Prism — notes at the speed of thought',
        description:
            'A realtime notebook that syncs the instant you type, keeps writing when you are offline, and publishes a single note with a link.',
    },
};

/**
 * The only part of this page that touches the network. Isolated in its own
 * Suspense boundary so everything else prerenders as static HTML — a landing
 * page that waits on an auth round trip before painting has already lost.
 */
async function NavWithAuth() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return <LandingNav isSignedIn={!!data?.claims?.sub} />;
}

const STEPS = [
    {
        n: '01',
        title: 'Write it down',
        body: 'A blank page and a slash menu. Headings, lists, code, images — reach for them when you need them, ignore them when you don’t.',
    },
    {
        n: '02',
        title: 'Tag it once',
        body: 'Two seconds now saves the archaeology later. Tags become filters, and filters become the way you find things in a year.',
    },
    {
        n: '03',
        title: 'Find it instantly',
        body: 'Press ⌘K and type any phrase from the body of the note. Search reads the whole document, not just the title.',
    },
];

export default function Home() {
    return (
        <div className="relative min-h-screen overflow-x-hidden bg-background">
            <Suspense fallback={<LandingNav isSignedIn={false} />}>
                <NavWithAuth />
            </Suspense>

            {/* Everything between the nav and the footer is one main landmark.
                Without it axe reports `landmark-one-main` plus a `region`
                violation for every section that ends up outside one — and a
                screen-reader user gets no "skip to main content" target. */}
            <main>
            {/* ================= HERO ================= */}
            <section className="relative isolate overflow-hidden px-5 pb-24 pt-32 sm:px-8 sm:pb-32 sm:pt-40">
                <Aurora />
                <div className="dot-field" aria-hidden />
                {/* A halo directly behind the headline. The drifting blobs
                    give the section its colour; this gives the type something
                    to sit on so it never lands on a flat patch. */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-24 h-[520px] w-[860px] max-w-[130vw] -translate-x-1/2 rounded-full opacity-70"
                    style={{
                        // No blur filter: the gradient's own falloff is the
                        // softness. blur-3xl on a box this size is a large
                        // surface for the compositor to carry through every
                        // scroll frame, in exchange for nothing visible.
                        background:
                            'radial-gradient(ellipse at center, hsl(var(--spectrum-violet) / 0.32), hsl(var(--spectrum-violet) / 0.12) 42%, transparent 70%)',
                    }}
                />

                <div className="relative mx-auto max-w-4xl text-center">
                    <Reveal>
                        <span className="glass-panel inline-flex items-center gap-2 px-4 py-1.5 text-xs font-medium text-foreground">
                            <Sparkles
                                size={13}
                                className="text-[hsl(var(--spectrum-violet))]"
                            />
                            Realtime · Offline-first · Shareable
                        </span>
                    </Reveal>

                    <Reveal delay={80}>
                        <h1 className="mt-7 text-balance text-5xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                            Notes at the{' '}
                            <span className="text-spectrum">speed of thought</span>
                        </h1>
                    </Reveal>

                    <Reveal delay={160}>
                        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
                            Prism syncs the instant you type, keeps writing when
                            the signal drops, and turns any single note into a
                            link you can send to anyone.
                        </p>
                    </Reveal>

                    <Reveal delay={240}>
                        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                href="/notes"
                                className="bg-spectrum sheen group inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-[hsl(var(--spectrum-violet))]/30 transition-transform duration-base ease-spring hover:scale-[1.035] sm:w-auto"
                            >
                                Start writing
                                <ArrowRight
                                    size={17}
                                    className="transition-transform duration-base ease-standard group-hover:translate-x-1"
                                />
                            </Link>
                            <Link
                                href="#features"
                                className="inline-flex w-full items-center justify-center rounded-2xl border border-border bg-card/50 px-7 py-3.5 text-base font-semibold text-foreground transition-colors duration-base ease-standard hover:border-[hsl(var(--spectrum-violet))]/50 sm:w-auto"
                            >
                                See what it does
                            </Link>
                        </div>
                    </Reveal>
                </div>

                {/* ---- The product, tilted ---- */}
                <Reveal delay={320} className="relative mx-auto mt-20 max-w-5xl">
                    {/* The window is lit from behind rather than just dropped
                        on the page — a wide, very soft spectrum bloom that
                        makes it read as a light source instead of a rectangle.
                        Static: no animation, so it costs one paint. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute -inset-x-16 -top-10 bottom-6 -z-10 opacity-90"
                        style={{
                            // Two overlapping ellipses instead of a blurred
                            // linear gradient. A linear gradient needs the blur
                            // to hide its edges; radial ones have none.
                            background: `
                                radial-gradient(60% 55% at 28% 45%, hsl(var(--spectrum-blue) / 0.42), transparent 72%),
                                radial-gradient(55% 55% at 72% 55%, hsl(var(--spectrum-pink) / 0.38), transparent 72%),
                                radial-gradient(70% 60% at 50% 50%, hsl(var(--spectrum-violet) / 0.4), transparent 70%)
                            `,
                        }}
                    />
                    <Tilt>
                        <AppPreview />
                    </Tilt>
                    {/* Fades the preview into the page rather than cutting it
                        off with a hard edge. */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 -bottom-px h-32 bg-gradient-to-t from-background to-transparent"
                    />
                </Reveal>
            </section>

            {/* ================= CAPABILITY STRIP ================= */}
            <section
                aria-label="At a glance"
                className="relative isolate border-y border-border/50 bg-card/30"
            >
                <AmbientWash tone="blue" />
                <div className="mx-auto grid max-w-5xl grid-cols-1 divide-y divide-border/50 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
                    {[
                        {
                            k: 'Under a second',
                            v: 'for an edit to reach your other devices',
                        },
                        {
                            k: 'Zero bars',
                            v: 'still writes, and syncs when you reconnect',
                        },
                        {
                            k: 'One link',
                            v: 'publishes a single note, revocable any time',
                        },
                    ].map((s, i) => (
                        <Reveal key={s.k} delay={i * 70} className="px-2 py-8 sm:px-8">
                            <p className="text-spectrum text-2xl font-bold tracking-tight">
                                {s.k}
                            </p>
                            <p className="mt-1.5 text-sm text-muted-foreground">
                                {s.v}
                            </p>
                        </Reveal>
                    ))}
                </div>
            </section>

            {/* ================= FEATURES ================= */}
            <FeatureBento />

            {/* ================= HOW IT WORKS ================= */}
            <section
                aria-labelledby="how-heading"
                className="relative isolate mx-auto max-w-6xl px-5 pb-24 sm:px-8 sm:pb-32"
            >
                <AmbientWash tone="pink" />
                <Reveal className="mb-14 max-w-2xl">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--spectrum-pink))]">
                        How it works
                    </p>
                    <h2
                        id="how-heading"
                        className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                    >
                        Three habits, and you never lose a thought again.
                    </h2>
                </Reveal>

                <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {STEPS.map((s, i) => (
                        <Reveal as="li" key={s.n} delay={i * 90}>
                            <div className="glass-panel h-full p-7">
                                <span className="text-spectrum text-sm font-bold tracking-[0.2em]">
                                    {s.n}
                                </span>
                                <h3 className="mb-2 mt-4 text-xl font-semibold tracking-tight text-foreground">
                                    {s.title}
                                </h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    {s.body}
                                </p>
                            </div>
                        </Reveal>
                    ))}
                </ol>
            </section>

            {/* ================= CTA ================= */}
            <section className="relative px-5 pb-28 sm:px-8 sm:pb-36">
                <Reveal className="relative mx-auto max-w-5xl">
                    <div className="glass-panel relative isolate overflow-hidden px-6 py-20 text-center sm:px-16">
                        <Aurora className="opacity-70" />
                        <div className="relative">
                            <PrismMark
                                size={44}
                                idSuffix="cta"
                                className="mx-auto mb-7 text-foreground"
                            />
                            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
                                Open a blank page.
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                                Everything above is already built. Sign in and
                                the first note is a keystroke away.
                            </p>
                            <Link
                                href="/notes"
                                className="bg-spectrum sheen group mt-10 inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold text-white shadow-xl shadow-[hsl(var(--spectrum-violet))]/30 transition-transform duration-base ease-spring hover:scale-[1.035]"
                            >
                                Start writing
                                <ArrowRight
                                    size={17}
                                    className="transition-transform duration-base ease-standard group-hover:translate-x-1"
                                />
                            </Link>
                        </div>
                    </div>
                </Reveal>
            </section>

            </main>

            {/* ================= FOOTER ================= */}
            <footer className="border-t border-border/50">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-9 sm:flex-row sm:px-8">
                    <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                        <PrismMark size={22} idSuffix="foot" />
                        Prism
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Built with Next.js and Supabase.
                    </p>
                </div>
            </footer>
        </div>
    );
}
