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
    // Only the parameters both functions declare. `p_sort` is attached below,
    // to the one call that takes it: count_notes has no sort parameter, and
    // PostgREST matches on the exact argument set, so passing it there made the
    // call resolve to nothing. See lib/notes-query.ts for the full story.
    const filterArgs = {
        p_query: null,
        p_tag: tagParam,
        p_favorites: favorites,
    };

    const [pageResult, countResult, tagsResult] = await Promise.all([
        supabase.rpc('search_notes', {
            ...filterArgs,
            p_sort: sort,
            p_limit: PAGE_SIZE,
            p_offset: 0,
        }),
        supabase.rpc('count_notes', filterArgs),
        supabase.rpc('note_tags'),
    ]);

    const notes = (pageResult.data ?? []) as Note[];

    const loadError =
        pageResult.error?.message ??
        countResult.error?.message ??
        tagsResult.error?.message ??
        null;

    return (
        <main className="flex-1 p-6 overflow-auto scrollbar-thin">
            <NotesList
                initialNotes={notes}
                /* Falling back to what actually loaded, not 0. A failed count
                   used to zero the total, and `hasMore` was derived from it —
                   so one broken RPC silently capped every account at its first
                   page. Paging no longer depends on this at all, but a total
                   that contradicts the rows on screen is still a lie. */
                initialTotal={
                    countResult.error ? notes.length : Number(countResult.data ?? 0)
                }
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
