'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useMediaQuery } from '@/lib/use-media-query';

/**
 * Tips its children in 3D towards the pointer.
 *
 * Three things keep this from being the usual janky parallax:
 *
 *  - Pointer moves are coalesced into one requestAnimationFrame. A raw
 *    mousemove handler runs far more often than the display refreshes, and
 *    writing a transform on each one is work thrown away.
 *  - It only runs where hovering exists. On touch there is no pointer to
 *    track, and a tilt that responds to a tap is just a glitch.
 *  - Reduced motion disables it outright, on top of the CSS override.
 *
 * The transform itself is composited, so the cost is a matrix multiply rather
 * than a layout pass.
 */
export default function Tilt({
    children,
    className = '',
    /** Degrees of rotation at the far edge. Past ~10 it stops reading as depth
     *  and starts reading as a bug. */
    max = 7,
    /** Lifts the whole card towards the viewer on hover. */
    lift = 18,
}: {
    children: ReactNode;
    className?: string;
    max?: number;
    lift?: number;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const frame = useRef<number | null>(null);
    const pending = useRef<{ x: number; y: number } | null>(null);

    const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
    const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
    const enabled = canHover && !reduced;

    const apply = useCallback(() => {
        frame.current = null;
        const el = ref.current;
        const next = pending.current;
        if (!el || !next) return;
        el.style.transform = `rotateX(${next.y}deg) rotateY(${next.x}deg) translateZ(${lift}px)`;
    }, [lift]);

    const onPointerMove = useCallback(
        (e: React.PointerEvent<HTMLDivElement>) => {
            if (!enabled) return;
            const el = ref.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            // -0.5..0.5 from the centre of the card.
            const px = (e.clientX - rect.left) / rect.width - 0.5;
            const py = (e.clientY - rect.top) / rect.height - 0.5;

            pending.current = { x: px * max * 2, y: -py * max * 2 };
            el.classList.add('is-tracking');
            if (frame.current === null) {
                frame.current = requestAnimationFrame(apply);
            }
        },
        [enabled, max, apply],
    );

    const onPointerLeave = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        pending.current = null;
        // Dropping is-tracking restores the transition, so it eases back to
        // rest instead of snapping.
        el.classList.remove('is-tracking');
        el.style.transform = '';
    }, []);

    useEffect(
        () => () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        },
        [],
    );

    return (
        <div className="scene">
            <div
                ref={ref}
                onPointerMove={onPointerMove}
                onPointerLeave={onPointerLeave}
                className={`tilt ${className}`}
            >
                {children}
            </div>
        </div>
    );
}
