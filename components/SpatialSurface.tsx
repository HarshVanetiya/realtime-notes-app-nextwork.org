'use client';

import {
    useCallback,
    useEffect,
    useRef,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import { useMediaQuery } from '@/lib/use-media-query';

/**
 * The interaction layer shared by every spatial tile.
 *
 * Two effects, both of which are easy to build expensively:
 *
 * GLARE — a specular highlight that follows the pointer. Implemented by writing
 * two custom properties on the element and letting a static CSS gradient read
 * them, so a pointer move repaints one gradient inside a layer that is already
 * composited. Writes are coalesced into one requestAnimationFrame: a raw
 * pointermove handler fires far more often than the display refreshes, and
 * every extra write is work thrown away.
 *
 * RIPPLE — grows from the exact point pressed. One absolutely positioned span
 * per press, animated on transform and opacity, removed on animationend.
 * Without that removal they accumulate for the life of the session.
 *
 * Both are gated: the glare needs a real pointer, and neither runs under
 * `prefers-reduced-motion` (the CSS hides them too — this just avoids doing the
 * work at all).
 */
export default function SpatialSurface({
    children,
    className = '',
    /** Set on the ripple's container so it cannot escape a rounded corner. */
    radiusClass = 'rounded-[1.25rem]',
    onClick,
}: {
    children: ReactNode;
    className?: string;
    radiusClass?: string;
    onClick?: () => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const frame = useRef<number | null>(null);
    const pending = useRef<{ x: number; y: number } | null>(null);

    const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
    const reduced = useMediaQuery('(prefers-reduced-motion: reduce)');
    const glareOn = canHover && !reduced;

    const flush = useCallback(() => {
        frame.current = null;
        const el = ref.current;
        const next = pending.current;
        if (!el || !next) return;
        el.style.setProperty('--mx', `${next.x}%`);
        el.style.setProperty('--my', `${next.y}%`);
    }, []);

    const onPointerMove = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (!glareOn) return;
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            pending.current = {
                x: ((e.clientX - r.left) / r.width) * 100,
                y: ((e.clientY - r.top) / r.height) * 100,
            };
            if (frame.current === null) frame.current = requestAnimationFrame(flush);
        },
        [glareOn, flush],
    );

    const onPointerDown = useCallback(
        (e: ReactPointerEvent<HTMLDivElement>) => {
            if (reduced) return;
            const el = ref.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;

            // Big enough to reach the far corner from wherever it started, so
            // the ripple always covers the whole tile rather than stopping
            // short when pressed near an edge.
            const size =
                2 * Math.max(Math.hypot(x, y), Math.hypot(r.width - x, y),
                             Math.hypot(x, r.height - y), Math.hypot(r.width - x, r.height - y));

            const span = document.createElement('span');
            span.className = 'ripple';
            span.style.width = `${size}px`;
            span.style.height = `${size}px`;
            span.style.left = `${x - size / 2}px`;
            span.style.top = `${y - size / 2}px`;
            span.addEventListener('animationend', () => span.remove(), { once: true });
            el.appendChild(span);
        },
        [reduced],
    );

    useEffect(
        () => () => {
            if (frame.current !== null) cancelAnimationFrame(frame.current);
        },
        [],
    );

    return (
        <div
            ref={ref}
            onPointerMove={onPointerMove}
            onPointerDown={onPointerDown}
            onClick={onClick}
            className={`group tile tile-interactive pressable overflow-hidden ${radiusClass} ${className}`}
        >
            {glareOn && <span className="glare" aria-hidden />}
            {children}
        </div>
    );
}
