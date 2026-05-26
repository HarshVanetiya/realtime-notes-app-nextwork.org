import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotesList from '@/components/NotesList';
import NoteForm from '@/components/NoteForm';
import { Suspense } from 'react';

async function NotesContent() {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();

    if (authError || !data?.claims?.sub) {
        redirect('/sign-in');
    }

    const userId = data.claims.sub;

    const { data: notes, error } = await supabase
        .from('notes')
        .select()
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notes:', error);
    }

    return (
        <div className="mx-auto max-w-4xl p-6">
            <div className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Notes</h1>
                <form action="/auth/signout" method="post">
                    <button
                        type="submit"
                        className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
                    >
                        Sign Out
                    </button>
                </form>
            </div>
            <NoteForm userId={userId} />
            <NotesList initialNotes={notes ?? []} userId={userId} />
        </div>
    );
}

export default function NotesPage() {
    return (
        <Suspense
            fallback={<div className="mx-auto max-w-4xl p-6">Loading notes...</div>}
        >
            <NotesContent />
        </Suspense>
    );
}
