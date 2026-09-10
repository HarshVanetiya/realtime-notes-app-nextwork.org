/**
 * The Prism mark: one beam in, a spectrum out.
 *
 * Drawn as a solid gradient triangle rather than an outlined one with a fan of
 * refracted rays. The detailed version was legible at 44px and turned into an
 * anonymous triangle at the 26px the nav actually uses — a mark that only works
 * at hero size is not a mark. Mass reads at every size; hairlines do not.
 *
 * Gradient ids are suffixed by `idSuffix` because several marks can share a
 * page, and duplicate ids make every instance resolve to the first one's
 * gradient.
 *
 * Two tones. `spectrum` is the brand mark and belongs on the landing page,
 * which is a marketing surface with its own look. `accent` is a flat fill of
 * whatever colour the user chose, and is what the product uses: a fixed
 * four-stop rainbow in the corner of an otherwise matte, single-accent
 * interface is the loudest thing on screen and answers to nobody's setting.
 */
export default function PrismMark({
    size = 32,
    className = '',
    idSuffix = 'a',
    tone = 'spectrum',
}: {
    size?: number;
    className?: string;
    idSuffix?: string;
    tone?: 'spectrum' | 'accent';
}) {
    const body = `prism-body-${idSuffix}`;
    const fill = tone === 'accent' ? 'hsl(var(--primary))' : `url(#${body})`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 32 32"
            fill="none"
            className={className}
            aria-hidden
        >
            {tone === 'spectrum' && (
                <defs>
                    <linearGradient id={body} x1="6" y1="3" x2="27" y2="28">
                        <stop offset="0%" stopColor="hsl(var(--spectrum-blue))" />
                        <stop offset="45%" stopColor="hsl(var(--spectrum-violet))" />
                        <stop offset="80%" stopColor="hsl(var(--spectrum-pink))" />
                        <stop offset="100%" stopColor="hsl(var(--spectrum-amber))" />
                    </linearGradient>
                </defs>
            )}

            {/* The beam going in — the only part that takes the text colour, so
                the mark sits in whatever context it is placed in. */}
            <path
                d="M0.5 16h6.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.45"
            />

            {/* The prism */}
            <path
                d="M14.05 4.1a2.2 2.2 0 0 1 3.9 0l9.6 18.5A2.2 2.2 0 0 1 25.6 25.9H6.4a2.2 2.2 0 0 1-1.95-3.3Z"
                fill={fill}
            />

            {/* The split: a wedge of the triangle held back, which is what makes
                it read as glass rather than as a plain shape. */}
            <path
                d="M16 4.6 6.1 23.6a1 1 0 0 0 .3.3h9.6Z"
                fill="hsl(0 0% 100%)"
                fillOpacity="0.22"
            />
        </svg>
    );
}
