// app/notes/[id]/page.tsx
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Suspense } from 'react';
import NoteRenderer from '@/components/NoteRenderer';

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
        .single();

    if (error || !note) {
        notFound();
    }

    return (
        <>
            {/* Cover Banner and Header Section */}
            <div className="mx-auto max-w-4xl px-6 pb-4 pt-12">
                <Link
                    href="/notes"
                    className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Notes
                </Link>
                
                {note.image_url && (
                    <div className="relative w-full h-[250px] sm:h-[350px] overflow-hidden rounded-2xl border border-border/60 bg-muted mb-8">
                        <img
                            src={note.image_url}
                            alt={note.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                )}
                
                <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
                    {note.title}
                </h1>
            </div>

            {/* Note Content */}
            <div className="mx-auto mt-8 max-w-4xl px-6">
                <div className="mx-auto mt-8 max-w-4xl px-6">
                    <NoteRenderer content={note.content} />
                </div>
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
        <div className="min-h-screen animate-fade-in bg-background pb-12">
            <Suspense
                fallback={
                    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-muted-foreground">
                        <Loader2 className="animate-spin" size={32} />
                        <p>Loading note...</p>
                    </div>
                }
            >
                {/* We pass the un-awaited Promise directly to the component inside Suspense */}
                <NoteContent paramsPromise={params} />
            </Suspense>
        </div>
    );
}
