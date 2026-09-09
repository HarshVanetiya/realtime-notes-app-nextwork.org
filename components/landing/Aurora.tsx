/**
 * The colour field everything else sits on.
 *
 * Four soft radial gradients, drifting on `transform` alone.
 *
 * They carried `filter: blur(90px)` at first. Measured at 4x CPU throttle that
 * cost a 183ms p95 frame and dropped 77% of frames while scrolling — worse
 * than the `backdrop-blur`-on-every-card problem earlier in this project. A
 * radial gradient that fades to transparent is already soft; the blur was
 * paying to smooth something that had no hard edge to begin with.
 *
 * No interactivity, so it stays a Server Component and ships no JavaScript.
 *
 * Sizes are clamped rather than pure `vw`: at 55vw a blob is 790px on a laptop
 * and 214px on a phone, which left the mobile hero looking washed out and grey
 * while the desktop one glowed.
 */
export default function Aurora({ className = '' }: { className?: string }) {
    return (
        <div className={`aurora ${className}`} aria-hidden>
            <div
                className="aurora-blob animate-drift-a"
                style={{
                    left: '-10%',
                    top: '-15%',
                    width: 'clamp(340px, 55vw, 900px)',
                    height: 'clamp(340px, 55vw, 900px)',
                    background:
                        'radial-gradient(circle, hsl(var(--spectrum-violet)) 0%, transparent 68%)',
                }}
            />
            <div
                className="aurora-blob animate-drift-b"
                style={{
                    right: '-15%',
                    top: '-5%',
                    width: 'clamp(320px, 50vw, 820px)',
                    height: 'clamp(320px, 50vw, 820px)',
                    background:
                        'radial-gradient(circle, hsl(var(--spectrum-blue)) 0%, transparent 68%)',
                }}
            />
            <div
                className="aurora-blob animate-drift-c"
                style={{
                    left: '20%',
                    bottom: '-25%',
                    width: 'clamp(300px, 45vw, 760px)',
                    height: 'clamp(300px, 45vw, 760px)',
                    background:
                        'radial-gradient(circle, hsl(var(--spectrum-pink)) 0%, transparent 68%)',
                }}
            />
            <div
                className="aurora-blob animate-drift-a"
                style={{
                    right: '5%',
                    bottom: '-20%',
                    width: 'clamp(260px, 38vw, 640px)',
                    height: 'clamp(260px, 38vw, 640px)',
                    animationDelay: '-12s',
                    background:
                        'radial-gradient(circle, hsl(var(--spectrum-teal)) 0%, transparent 68%)',
                }}
            />
        </div>
    );
}
