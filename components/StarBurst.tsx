'use client';

import { Star } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface BurstOrigin {
    x: number;
    y: number;
    id: number;
}

const SPARKLES = [
    { dx: 38, dy: 0 },
    { dx: 19, dy: 33 },
    { dx: -19, dy: 33 },
    { dx: -38, dy: 0 },
    { dx: -19, dy: -33 },
    { dx: 19, dy: -33 },
];

export default function StarBurst({
    origin,
    onComplete,
}: {
    origin: BurstOrigin;
    onComplete?: () => void;
}) {
    const [active, setActive] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => {
            setActive(false);
            onComplete?.();
        }, 750);
        return () => clearTimeout(t);
    }, [onComplete]);

    if (!active) return null;

    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute z-50 select-none"
            style={{ left: origin.x, top: origin.y }}
        >
            {/* Pulsing golden star */}
            <div
                className="star-pop-anim flex items-center justify-center text-amber-400 drop-shadow-[0_4px_12px_rgba(251,191,36,0.7)]"
                style={{
                    animation: 'star-pop 700ms var(--ease-spring) forwards',
                }}
            >
                <Star size={44} fill="currentColor" strokeWidth={1.5} />
            </div>

            {/* Orbiting celebratory sparkles */}
            {SPARKLES.map((s, idx) => (
                <span
                    key={idx}
                    className="spark-burst-anim absolute h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                    style={
                        {
                            left: 0,
                            top: 0,
                            '--dx': `${s.dx}px`,
                            '--dy': `${s.dy}px`,
                            animation:
                                'spark-burst 650ms var(--ease-exit) forwards',
                            animationDelay: `${idx * 20}ms`,
                        } as React.CSSProperties
                    }
                />
            ))}
        </div>
    );
}
