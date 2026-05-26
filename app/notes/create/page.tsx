import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NoteForm from '@/components/NoteForm';
import AppHeader from '@/components/app-header';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

async function CreateNoteContent() {
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();

    if (authError || !data?.claims?.sub) {
        redirect('/auth/login');
    }

    const userId = data.claims.sub;

    return (
        <>
            <AppHeader
                title="Create Note"
                subtitle="Capture your thoughts, ideas, and more"
                action={
                    <Link
                        href="/notes"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/50 transition-all duration-150"
                    >
                        <ArrowLeft size={15} />
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                }
            />
            <main className="flex-1 p-6 overflow-auto scrollbar-thin">
                <div className="max-w-2xl mx-auto animate-fade-in">
                    <NoteForm userId={userId} />
                </div>
            </main>
        </>
    );
}

export default function CreateNotePage() {
    return (
        <Suspense
            fallback={
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                </div>
            }
        >
            <CreateNoteContent />
        </Suspense>
    );
}
