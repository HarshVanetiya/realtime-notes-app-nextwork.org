import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotesList from '@/components/NotesList';
import { Suspense } from 'react';

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
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching notes:', error);
    }

    const noteCount = notes?.length ?? 0;

    return (
        <>
            <main className="flex-1 p-6 overflow-auto scrollbar-thin">
                <NotesList initialNotes={notes ?? []} userId={userId} />
            </main>
        </>
    );
}

export default function NotesPage() {
    return (
        <Suspense
            fallback={
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading notes...</p>
                    </div>
                </div>
            }
        >
            <NotesContent />
        </Suspense>
    );
}
