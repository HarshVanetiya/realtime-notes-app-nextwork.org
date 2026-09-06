import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NotesList from '@/components/NotesList';
import { Suspense } from 'react';
import NotesGridSkeleton from '@/components/NotesGridSkeleton';
import { PAGE_SIZE } from '@/lib/notes-query';
import { isSortValue, type SortValue } from '@/lib/note-tags';
import type { Note } from '@/lib/note-types';

export const metadata = { title: 'My notes' };

type Search = Promise<{ [k: string]: string | string[] | undefined }>;

async function NotesContent({ searchParams }: { searchParams: Search }) {
    const params = await searchParams;
    const supabase = await createClient();
    const { data, error: authError } = await supabase.auth.getClaims();

    if (authError || !data?.claims?.sub) {
        redirect('/auth/login');
    }

    const userId = data.claims.sub;

    const tagParam = typeof params.tag === 'string' ? params.tag : null;
    const sortParam = typeof params.sort === 'string' ? params.sort : null;
    const sort: SortValue = isSortValue(sortParam) ? sortParam : 'newest';
    const favorites = params.filter === 'favorites';

    // The first page, the total, and the tag census, in parallel — three
    // round trips one after another is three round trips the user waits for.
    //
    // Search is deliberately absent here: the query lives in component state
    // rather than the URL, so the server renders the unsearched first page and
    // the client takes over the moment anyone types. Putting it in the URL
    // would mean a server round trip per keystroke.
    const rpcArgs = {
        p_query: null,
        p_tag: tagParam,
        p_favorites: favorites,
        p_sort: sort,
    };

    const [pageResult, countResult, tagsResult] = await Promise.all([
        supabase.rpc('search_notes', {
            ...rpcArgs,
            p_limit: PAGE_SIZE,
            p_offset: 0,
        }),
        supabase.rpc('count_notes', rpcArgs),
        supabase.rpc('note_tags'),
    ]);

    const loadError =
        pageResult.error?.message ??
        countResult.error?.message ??
        tagsResult.error?.message ??
        null;

    return (
        <main className="flex-1 p-6 overflow-auto scrollbar-thin">
            <NotesList
                initialNotes={(pageResult.data ?? []) as Note[]}
                initialTotal={Number(countResult.data ?? 0)}
                initialTags={tagsResult.data ?? []}
                userId={userId}
                loadError={loadError}
            />
        </main>
    );
}

export default function NotesPage({ searchParams }: { searchParams: Search }) {
    return (
        <Suspense
            fallback={
                <main className="flex-1 overflow-auto p-6 scrollbar-thin">
                    <NotesGridSkeleton />
                </main>
            }
        >
            <NotesContent searchParams={searchParams} />
        </Suspense>
    );
}
