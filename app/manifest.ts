import type { MetadataRoute } from 'next';

/**
 * Installable on a phone home screen, which is where a notes app is actually
 * used. `standalone` drops the browser chrome; the theme colour matches the
 * dark background so the status bar does not flash white on launch.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Prism — notes at the speed of thought',
        short_name: 'Prism',
        description:
            'Notes that sync live across your devices. Write, tag, search and share.',
        start_url: '/notes',
        display: 'standalone',
        background_color: '#0d0e10',
        theme_color: '#0d0e10',
        icons: [
            { src: '/icon.svg?v=2', sizes: 'any', type: 'image/svg+xml' },
            { src: '/icon.svg?v=2', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
            { src: '/icon.svg?v=2', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
    };
}
