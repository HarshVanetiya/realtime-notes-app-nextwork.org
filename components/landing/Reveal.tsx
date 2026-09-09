'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Reveals its children when they scroll into view.
 *
 * Two safeguards, because the failure mode of a scroll animation is a blank
 * page — much worse than no animation at all:
 *
 *  1. A timeout reveals everything after 2.5s no matter what, so a browser
 *     without IntersectionObserver, or a page whose observer never fires
 *     (an element inside a scroll container, a print stylesheet), still shows
 *     its content.
 *  2. `prefers-reduced-motion` is handled in CSS rather than here, so the
 *     content is visible even before this component hydrates.
 *
 * The observer disconnects after firing: this is an entrance, not a state, and
 * content that re-hides when scrolled past is a nuisance to re-read.
 */
export default function Reveal({
    children,
    delay = 0,
    className = '',
    as: Tag = 'div',
}: {
    children: ReactNode;
    /** Stagger, in ms. Kept small — a long cascade feels like a slow page. */
    delay?: number;
    className?: string;
    as?: 'div' | 'section' | 'li' | 'span';
}) {
    const ref = useRef<HTMLElement | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const show = () => el.classList.add('is-revealed');

        if (typeof IntersectionObserver === 'undefined') {
            show();
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    show();
                    observer.disconnect();
                }
            },
            // Fires a little before the element is fully on screen, so the
            // motion has finished by the time it is being read.
            { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
        );
        observer.observe(el);

        const failsafe = setTimeout(() => {
            show();
            observer.disconnect();
        }, 2500);

        return () => {
            observer.disconnect();
            clearTimeout(failsafe);
        };
    }, []);

    return (
        <Tag
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ref={ref as any}
            className={`reveal ${className}`}
            style={{ ['--reveal-delay' as string]: `${delay}ms` }}
        >
            {children}
        </Tag>
    );
}
