import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import TrashList from '@/components/TrashList';
import { Skeleton } from '@/components/ui/skeleton';
import type { Note } from '@/lib/note-types';

export const metadata = { title: 'Trash' };

function Shell({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
            <Link
                href="/notes"
                className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:text-foreground"
            >
                <ArrowLeft size={16} />
                Back to notes
            </Link>
            <h1 className="mb-1 text-2xl font-bold tracking-tight text-foreground">
                Trash
            </h1>
            <p className="mb-6 text-sm text-muted-foreground">
                Restore a note, or remove it for good.
            </p>
            {children}
        </main>
    );
}

// Data access sits inside Suspense: with cacheComponents on, an uncached read
// in the route body blocks the whole page from streaming.
async function TrashContent() {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) redirect('/auth/login');

    const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

    return <TrashList initialNotes={(notes as Note[]) ?? []} />;
}

export default function TrashPage() {
    return (
        <Suspense
            fallback={
                <Shell>
                    <div
                        role="status"
                        aria-label="Loading trash"
                        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className="rounded-2xl border border-border/60 bg-card/70 p-4"
                            >
                                <Skeleton className="h-5 w-2/3" />
                                <Skeleton className="mt-3 h-3 w-full" />
                                <Skeleton className="mt-4 h-3 w-24" />
                                <Skeleton className="mt-4 h-9 w-40 rounded-xl" />
                            </div>
                        ))}
                    </div>
                </Shell>
            }
        >
            <Shell>
                <TrashContent />
            </Shell>
        </Suspense>
    );
}
