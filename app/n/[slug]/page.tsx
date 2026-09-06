import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { renderNoteHtml } from '@/lib/note-html';
import { extractPlainText } from '@/lib/note-text';
import NoteHtml from '@/components/NoteHtml';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type PublicNote = {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    tags: string[] | null;
    created_at: string;
    updated_at: string | null;
};

/**
 * The single public read path. get_public_note is a security definer function
 * with a fixed column list, so this cannot see user_id even by accident, and
 * without a slug there is nothing to enumerate.
 */
async function fetchPublicNote(slug: string): Promise<PublicNote | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('get_public_note', {
        p_slug: slug,
    });
    if (error || !data || data.length === 0) return null;
    return data[0] as PublicNote;
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const note = await fetchPublicNote(slug);

    if (!note) {
        return { title: 'Note not found', robots: { index: false } };
    }

    const excerpt = extractPlainText(note.content).slice(0, 160);

    return {
        title: note.title,
        description: excerpt || 'A note shared from Slate.',
        openGraph: {
            title: note.title,
            description: excerpt || 'A note shared from Slate.',
            type: 'article',
            publishedTime: note.created_at,
            images: note.image_url ? [{ url: note.image_url }] : undefined,
        },
        twitter: {
            card: note.image_url ? 'summary_large_image' : 'summary',
            title: note.title,
            description: excerpt || 'A note shared from Slate.',
        },
        // A shared link is meant for whoever holds it, not for search engines.
        robots: { index: false, follow: false },
    };
}

// params is awaited in here, not in the route body: with cacheComponents on,
// awaiting it outside Suspense blocks the whole page from streaming.
async function PublicNoteContent({
    paramsPromise,
}: {
    paramsPromise: Promise<{ slug: string }>;
}) {
    const { slug } = await paramsPromise;
    const note = await fetchPublicNote(slug);
    if (!note) notFound();

    const html = await renderNoteHtml(note.content);

    return (
        <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
            {note.image_url && (
                <div className="relative mb-8 h-[180px] w-full overflow-hidden rounded-2xl border border-border/60 bg-muted sm:h-[280px]">
                    <Image
                        src={note.image_url}
                        alt={note.title}
                        fill
                        priority
                        sizes="(min-width: 768px) 768px, 100vw"
                        className="object-cover"
                    />
                </div>
            )}

            <h1 className="min-w-0 break-words text-3xl font-extrabold tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
                {note.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <time
                    dateTime={note.created_at}
                    className="text-sm text-muted-foreground"
                >
                    {new Date(note.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </time>
                {(note.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-medium">
                        {tag}
                    </Badge>
                ))}
            </div>

            <div className="mt-10">
                <NoteHtml html={html} />
            </div>

            <footer className="mt-16 border-t border-border/60 pt-6 text-sm text-muted-foreground">
                Shared from{' '}
                <Link href="/" className="font-medium text-primary-text hover:underline">
                    Slate
                </Link>
                . Only this note is public.
            </footer>
        </article>
    );
}

export default function PublicNotePage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    return (
        <main className="min-h-screen bg-background">
            <Suspense
                fallback={
                    <div
                        role="status"
                        aria-label="Loading note"
                        className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16"
                    >
                        <Skeleton className="h-10 w-3/4" />
                        <Skeleton className="mt-3 h-10 w-1/2" />
                        <div className="mt-10 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    </div>
                }
            >
                <PublicNoteContent paramsPromise={params} />
            </Suspense>
        </main>
    );
}
