import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotesList from '@/components/NotesList';
import { Suspense } from 'react';
import NotesGridSkeleton from '@/components/NotesGridSkeleton';

async function NotesContent() {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();

    if (authError || !data?.claims?.sub) {
        redirect('/auth/login');
    }

    const userId = data.claims.sub;

    const { data: notes, error } = await supabase
        .from('notes')
        .select()
        // Trashed notes live in /notes/trash, never in the main list.
        .is('deleted_at', null)
        .order('created_at', { ascending: false });


    return (
        <>
            <main className="flex-1 p-6 overflow-auto scrollbar-thin">
                <NotesList
                    initialNotes={notes ?? []}
                    userId={userId}
                    loadError={error?.message ?? null}
                />
            </main>
        </>
    );
}

export default function NotesPage() {
    return (
        <Suspense
            fallback={
                <main className="flex-1 overflow-auto p-6 scrollbar-thin">
                    <NotesGridSkeleton />
                </main>
            }
        >
            <NotesContent />
        </Suspense>
    );
}
