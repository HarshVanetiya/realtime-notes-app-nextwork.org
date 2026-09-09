import type { MetadataRoute } from 'next';

/**
 * Installable on a phone home screen, which is where a notes app is actually
 * used. `standalone` drops the browser chrome; the theme colour matches the
 * dark background so the status bar does not flash white on launch.
 */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Slate — realtime notes',
        short_name: 'Slate',
        description:
            'Notes that sync live across your devices. Write, tag, search and share.',
        start_url: '/notes',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
        icons: [
            { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
    };
}
