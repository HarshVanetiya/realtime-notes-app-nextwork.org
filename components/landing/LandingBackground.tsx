'use client';

import { useState, useEffect } from 'react';

export default function LandingBackground() {
    const [isSynced, setIsSynced] = useState(true);

    useEffect(() => {
        const onToggle = () => setIsSynced((prev) => !prev);
        window.addEventListener('prism:sync-toggle', onToggle);
        return () => window.removeEventListener('prism:sync-toggle', onToggle);
    }, []);

    return (
        <>
            {/* Subtle Film Grain SVG Overlay */}
            <svg
                className="film-grain"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
            >
                <filter id="noiseFilter">
                    <feTurbulence
                        baseFrequency="0.85"
                        numOctaves="3"
                        stitchTiles="stitch"
                        type="fractalNoise"
                    />
                    <feColorMatrix type="saturate" values="0" />
                </filter>
                <rect filter="url(#noiseFilter)" height="100%" width="100%" />
            </svg>

            {/* Ambient dynamic glow attached to root sync simulation state */}
            <div
                id="ambient-glow"
                aria-hidden
                className={`${
                    isSynced ? 'state-glow-cyan' : 'state-glow-violet'
                } fixed inset-0 pointer-events-none z-0`}
            />
        </>
    );
}
