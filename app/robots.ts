import type { MetadataRoute } from 'next';

/**
 * Nothing here should be indexed.
 *
 * `/notes` is behind auth, and `/n/<slug>` is deliberately unlisted: a shared
 * link is meant to be passed to a person, not discovered through a search
 * engine. The route sets `noindex` in its own metadata too — this is the
 * belt-and-braces version for crawlers that never render the page.
 */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [{ userAgent: '*', disallow: ['/notes', '/n/', '/auth'] }],
    };
}
