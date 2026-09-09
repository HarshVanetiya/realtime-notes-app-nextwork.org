/**
 * A colour wash for any section that would otherwise be a flat slab.
 *
 * Deliberately NOT the Aurora component. Aurora's blobs are small and tight,
 * so they need `filter: blur()` to soften — and they drift, so the compositor
 * is doing work the whole time. That is worth paying for once, in the hero.
 * Repeating it down the page, or behind a scrolling note grid, would mean more
 * blurred animating layers competing with the scroll.
 *
 * These are large radial gradients with a long transparent falloff, which are
 * soft by construction. No filter, no animation: one paint, then nothing.
 */
export default function AmbientWash({
    className = '',
    tone = 'violet',
    /** Pins to the viewport instead of the section — for a scrolling app shell,
     *  where an absolutely positioned wash would scroll away and leave the
     *  lower half of a long note list grey again. */
    fixed = false,
    strength = 'soft',
}: {
    className?: string;
    tone?: 'violet' | 'blue' | 'pink';
    fixed?: boolean;
    /** `soft` for pages that already carry colour of their own; `strong` for
     *  the app shell, where this is the only thing between the content and a
     *  flat slab of near-black. */
    strength?: 'soft' | 'strong';
}) {
    const a = strength === 'strong' ? 0.26 : 0.16;
    const bAlpha = strength === 'strong' ? 0.2 : 0.12;
    const accent = `hsl(var(--spectrum-${tone}) / ${a})`;
    const second =
        tone === 'violet'
            ? `hsl(var(--spectrum-blue) / ${bAlpha})`
            : `hsl(var(--spectrum-violet) / ${bAlpha})`;

    // Sections get a box extended past their own bounds, with the gradient
    // centres well inside it. Centring an ellipse on the box edge clips half of
    // it, which draws exactly the hard horizontal seam this is meant to avoid —
    // the wash read as a lighter rectangle pasted over the section rather than
    // as light falling across it.
    const position = fixed ? 'fixed inset-0' : 'absolute -inset-y-32 inset-x-0';

    return (
        <div
            aria-hidden
            className={`pointer-events-none -z-10 ${position} ${className}`}
            style={{
                backgroundImage: `
                    radial-gradient(55% 40% at 14% 22%, ${accent}, transparent 72%),
                    radial-gradient(48% 36% at 86% 62%, ${second}, transparent 74%)
                `,
            }}
        />
    );
}
