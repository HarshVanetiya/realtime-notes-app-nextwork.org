// app/notes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Suspense } from 'react';
import NoteHtml from '@/components/NoteHtml';
import { renderNoteHtml } from '@/lib/note-html';
import EditNoteModal from '@/components/EditNoteModal';
import { Badge } from '@/components/ui/badge';

// 1. The inner component now receives the Promise directly and awaits it inside
async function NoteContent({
    paramsPromise,
}: {
    paramsPromise: Promise<{ id: string }>;
}) {
    const { id } = await paramsPromise;
    const supabase = await createClient();

    const { data: note, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

    if (error || !note) {
        notFound();
    }

    // Serialized here so this route ships no editor JavaScript.
    const html = await renderNoteHtml(note.content);

    return (
        <>
            {/* Cover Banner and Header Section */}
            <div className="mx-auto max-w-4xl px-4 pb-4 pt-6 sm:px-6 sm:pt-12">
                <Link
                    href="/notes"
                    className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Notes
                </Link>
                
                {note.image_url && (
                    <div className="relative w-full h-[180px] sm:h-[280px] md:h-[350px] overflow-hidden rounded-2xl border border-border/60 bg-muted mb-8">
                        <Image
                            src={note.image_url}
                            alt={note.title}
                            fill
                            priority
                            sizes="(min-width: 896px) 896px, 100vw"
                            className="object-cover"
                        />
                    </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <h1 className="min-w-0 break-words [overflow-wrap:anywhere] text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
                        {note.title}
                    </h1>
                    <EditNoteModal initialData={note}>
                        <button className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary-text hover:bg-primary/20 transition-colors font-medium text-sm">
                            <Pencil size={16} />
                            Edit Note
                        </button>
                    </EditNoteModal>
                </div>
            </div>

            {(note.tags ?? []).length > 0 && (
                <div className="mx-auto max-w-4xl px-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                        {(note.tags as string[]).map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="secondary"
                                className="break-all font-medium"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Note Content */}
            <div className="mx-auto mt-8 max-w-4xl px-4 sm:px-6">
                <NoteHtml html={html} />
            </div>
        </>
    );
}

// 2. The main page no longer awaits anything! It is 100% static!
// In Next.js 15+, params is a Promise
export default function IndividualNotePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    return (
        <main className="min-h-screen animate-fade-in bg-background pb-12">
            <Suspense
                fallback={
                    <div
                        role="status"
                        aria-label="Loading note"
                        className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 sm:pt-12"
                    >
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="mt-8 h-10 w-3/4" />
                        <Skeleton className="mt-3 h-10 w-1/2" />
                        <div className="mt-10 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-11/12" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    </div>
                }
            >
                {/* We pass the un-awaited Promise directly to the component inside Suspense */}
                <NoteContent paramsPromise={params} />
            </Suspense>
        </main>
    );
}
