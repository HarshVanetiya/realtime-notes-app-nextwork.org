import Reveal from './Reveal';
import AmbientWash from '@/components/AmbientWash';
import {
    CloudOff,
    Command,
    Link2,
    RotateCcw,
    SearchCheck,
    Type,
    Waypoints,
} from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The feature grid.
 *
 * Every illustration is built from the app's own tokens rather than dropped in
 * as an image: they stay in step with the theme, they weigh nothing, and none
 * of them can show a version of the product that no longer exists.
 */

function Card({
    icon,
    title,
    body,
    children,
    className = '',
    delay = 0,
}: {
    icon: ReactNode;
    title: string;
    body: string;
    children?: ReactNode;
    className?: string;
    delay?: number;
}) {
    return (
        <Reveal delay={delay} className={className}>
            <article className="group glass-panel relative flex h-full flex-col overflow-hidden p-6 transition-transform duration-base ease-standard motion-safe:hover:-translate-y-1">
                {/* A spectrum bloom that only shows on hover — the card is calm
                    at rest and lights up when you go looking at it. */}
                <div
                    aria-hidden
                    className="bg-spectrum-soft pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-slow ease-standard group-hover:opacity-100"
                />
                <div className="relative flex h-full flex-col">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--spectrum-violet))]/12 text-[hsl(var(--spectrum-violet))] ring-1 ring-[hsl(var(--spectrum-violet))]/25">
                        {icon}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                        {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                        {body}
                    </p>
                    {/* Pushed to the bottom. Cards in a row stretch to the
                        tallest, and without this the wide ones left a lake of
                        empty space between the copy and the card edge. */}
                    {children ? <div className="mt-auto">{children}</div> : null}
                </div>
            </article>
        </Reveal>
    );
}

function Bar({ w, tone = 'muted' }: { w: string; tone?: 'muted' | 'accent' }) {
    return (
        <div
            className={`h-1.5 rounded-full ${
                tone === 'accent'
                    ? 'bg-[hsl(var(--spectrum-violet))]/45'
                    : 'bg-foreground/10'
            }`}
            style={{ width: w }}
        />
    );
}

export default function FeatureBento() {
    return (
        <section
            id="features"
            aria-labelledby="features-heading"
            className="relative isolate mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32"
        >
            <AmbientWash tone="violet" />
            <Reveal className="mb-14 max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[hsl(var(--spectrum-violet))]">
                    What it does
                </p>
                <h2
                    id="features-heading"
                    className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
                >
                    Everything a note needs, and nothing it doesn&apos;t.
                </h2>
            </Reveal>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Realtime — the wide one */}
                <Card
                    className="lg:col-span-2"
                    icon={<Waypoints size={19} />}
                    title="Live on every device at once"
                    body="Open Prism on a laptop and a phone and they stay the same document. Edits, stars and deletions arrive in under a second — no refresh, no merge dialog, no “who has it open?”."
                >
                    <div
                        aria-hidden
                        className="relative mt-7 flex items-center gap-3"
                    >
                        <div className="flex-1 rounded-xl border border-border/60 bg-background/40 p-3">
                            <div className="space-y-1.5">
                                <Bar w="80%" tone="accent" />
                                <Bar w="60%" />
                                <Bar w="70%" />
                            </div>
                        </div>
                        {/* The packet in flight */}
                        <div className="relative h-px w-14 bg-gradient-to-r from-[hsl(var(--spectrum-violet))]/30 to-[hsl(var(--spectrum-blue))]/30">
                            <span
                                className="animate-travel-x absolute -top-[3px] left-0 h-1.5 w-1.5 rounded-full bg-[hsl(var(--spectrum-violet))] shadow-[0_0_10px_hsl(var(--spectrum-violet))]"
                                style={{ ['--travel-distance' as string]: '56px' }}
                            />
                        </div>
                        <div className="flex-1 rounded-xl border border-border/60 bg-background/40 p-3">
                            <div className="space-y-1.5">
                                <Bar w="80%" tone="accent" />
                                <Bar w="60%" />
                                <Bar w="70%" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Command palette */}
                <Card
                    icon={<Command size={19} />}
                    title="⌘K goes anywhere"
                    body="One shortcut to search every note by its contents, jump to a tag, flip the theme, or hand the query to the web when nothing here matches."
                    delay={60}
                >
                    <div
                        aria-hidden
                        className="mt-7 rounded-xl border border-border/60 bg-background/40 p-2"
                    >
                        <div className="mb-1 flex items-center gap-2 rounded-lg bg-[hsl(var(--spectrum-violet))]/14 px-2.5 py-2">
                            <span className="h-3 w-3 rounded bg-[hsl(var(--spectrum-violet))]/60" />
                            <Bar w="64%" tone="accent" />
                        </div>
                        {['58%', '44%'].map((w) => (
                            <div
                                key={w}
                                className="flex items-center gap-2 px-2.5 py-2"
                            >
                                <span className="h-3 w-3 rounded bg-foreground/10" />
                                <Bar w={w} />
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Offline */}
                <Card
                    icon={<CloudOff size={19} />}
                    title="Writes survive the tunnel"
                    body="Lose signal and Prism keeps taking notes. Every change is stored on the device and replayed the moment you reconnect — including the one you made just before the train went under."
                    delay={40}
                >
                    <div
                        aria-hidden
                        className="mt-7 flex items-center gap-2 rounded-xl border border-[hsl(var(--spectrum-amber))]/35 bg-[hsl(var(--spectrum-amber))]/[0.08] px-3 py-2.5"
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--spectrum-amber))]" />
                        <span className="text-[11px] font-medium text-foreground">
                            2 changes waiting
                        </span>
                    </div>
                </Card>

                {/* Sharing */}
                <Card
                    icon={<Link2 size={19} />}
                    title="Publish one note, not your account"
                    body="Flip a switch and a single note gets an unguessable URL that anyone can read. Flip it back and the link is dead — re-sharing mints a new one rather than reviving the old."
                    delay={80}
                >
                    <div
                        aria-hidden
                        className="mt-7 truncate rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 font-mono text-[11px] text-muted-foreground"
                    >
                        prism.app/n/
                        <span className="text-[hsl(var(--spectrum-violet))]">
                            Jeg4-Cisx2q0JdAQ
                        </span>
                    </div>
                </Card>

                {/* Editor */}
                <Card
                    icon={<Type size={19} />}
                    title="An editor that gets out of the way"
                    body="Headings, lists, code blocks and images, with a slash menu when you want it and nothing on screen when you don't."
                    delay={120}
                >
                    <div
                        aria-hidden
                        className="mt-7 space-y-2 rounded-xl border border-border/60 bg-background/40 p-3"
                    >
                        <div className="h-2.5 w-2/5 rounded-full bg-foreground/25" />
                        <Bar w="90%" />
                        <Bar w="76%" />
                        <div className="rounded-lg bg-foreground/[0.07] p-2">
                            <div className="space-y-1.5">
                                <Bar w="52%" tone="accent" />
                                <Bar w="38%" />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Search — wide */}
                <Card
                    className="lg:col-span-2"
                    icon={<SearchCheck size={19} />}
                    title="Search that reads the whole note"
                    body="Not just titles. Prism indexes the body text of every note in the database, so a half-remembered phrase from six months ago is one query away — and it stays fast whether you have fifty notes or fifty thousand."
                    delay={40}
                >
                    <div
                        aria-hidden
                        className="mt-7 flex flex-wrap items-center gap-2"
                    >
                        <span className="rounded-lg border border-border/60 bg-background/40 px-3 py-2 font-mono text-[11px] text-foreground">
                            rye flour
                            <span className="animate-caret ml-0.5 inline-block h-3 w-px translate-y-0.5 bg-[hsl(var(--spectrum-violet))]" />
                        </span>
                        <span className="text-xs text-muted-foreground">
                            found in
                        </span>
                        <span className="rounded-lg border border-[hsl(var(--spectrum-violet))]/35 bg-[hsl(var(--spectrum-violet))]/12 px-3 py-2 text-[11px] font-medium text-foreground">
                            Sourdough — hydration notes
                        </span>
                    </div>
                </Card>

                {/* Undo */}
                <Card
                    icon={<RotateCcw size={19} />}
                    title="Nothing is deleted in anger"
                    body="Deleting is one tap and always undoable. Notes rest in Trash until you empty it yourself."
                    delay={80}
                >
                    <div
                        aria-hidden
                        className="mt-7 flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2.5"
                    >
                        <span className="text-[11px] text-muted-foreground">
                            Moved to trash
                        </span>
                        <span className="ml-auto rounded-md bg-[hsl(var(--spectrum-violet))]/15 px-2 py-1 text-[10px] font-semibold text-[hsl(var(--spectrum-violet))]">
                            Undo
                        </span>
                    </div>
                </Card>
            </div>
        </section>
    );
}
