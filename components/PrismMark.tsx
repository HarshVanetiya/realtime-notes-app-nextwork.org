/**
 * The Prism mark: refined spatial geometric prism.
 *
 * Sourced directly from the Stitch "Prism Spatial Landing Page" design.
 * Features a frosted glass facet, dual cyan-violet ambient edge glow,
 * specular dashed reflection line, and illuminated apex vertices.
 */
export default function PrismMark({
    size = 32,
    className = '',
    idSuffix = 'a',
}: {
    size?: number;
    className?: string;
    idSuffix?: string;
    tone?: 'spectrum' | 'accent';
}) {
    const glowId = `prismGlow-${idSuffix}`;
    const facetId = `prismFacet-${idSuffix}`;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            fill="none"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <defs>
                <linearGradient
                    id={glowId}
                    x1="4"
                    y1="4"
                    x2="36"
                    y2="36"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#00E5FF" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                </linearGradient>
                <linearGradient
                    id={facetId}
                    x1="20"
                    y1="6"
                    x2="32"
                    y2="32"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0.1} />
                </linearGradient>
            </defs>
            {/* Refined geometric prism polygon */}
            <polygon
                points="20,6 34,31 6,31"
                fill="rgba(14, 15, 17, 0.6)"
                stroke={`url(#${glowId})`}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <polygon
                points="20,6 20,31 34,31"
                fill={`url(#${facetId})`}
            />
            <line
                x1="20"
                y1="6"
                x2="20"
                y2="31"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth="1.2"
                strokeDasharray="1 1"
            />
            <circle cx="20" cy="6" r="2.5" fill="#00E5FF" />
            <circle cx="6" cy="31" r="2" fill="#8B5CF6" />
            <circle cx="34" cy="31" r="2" fill="#00E5FF" />
        </svg>
    );
}
