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
            {/* Banner Section */}
            {note.image_url ? (
                <div className="relative flex h-[50vh] min-h-[300px] w-full items-end justify-center overflow-hidden">
                    <div
                        className="absolute inset-0 scale-110 bg-cover bg-center opacity-50 blur-xl"
                        style={{ backgroundImage: `url(${note.image_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                    <img
                        src={note.image_url}
                        alt={note.title}
                        className="absolute inset-0 z-10 h-full w-full object-contain opacity-40"
                    />
                    <div className="relative z-20 mx-auto w-full max-w-4xl px-6 pb-8">
                        <Link
                            href="/notes"
                            className="mb-4 inline-flex items-center gap-2 rounded-full bg-background/50 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur-md transition-colors hover:text-foreground"
                        >
                            <ArrowLeft size={16} />
                            Back to Notes
                        </Link>
                        <h1 className="text-5xl font-bold text-foreground drop-shadow-lg">
                            {note.title}
                        </h1>
                    </div>
                </div>
            ) : (
                <div className="mx-auto max-w-4xl px-6 pb-8 pt-12">
                    <Link
                        href="/notes"
                        className="mb-6 inline-flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <ArrowLeft size={16} />
                        Back to Notes
                    </Link>
                    <h1 className="text-5xl font-bold">{note.title}</h1>
                </div>
            )}

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
