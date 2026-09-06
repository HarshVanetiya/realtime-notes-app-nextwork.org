'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Note } from '@/lib/note-types';
import type { SortValue } from '@/lib/note-tags';

/**
 * The read path, now that the dashboard no longer downloads the whole table.
 *
 * Everything here goes through the functions added in 0008 rather than through
 * PostgREST filters, for one reason: search. Matching a note's body means
 * matching text buried in a BlockNote JSON document, which only the database's
 * generated tsvector can do. Once search is server-side, paging has to be too,
 * or the two disagree about what "the results" are.
 */

export const PAGE_SIZE = 24;

export type NotesQuery = {
    query: string;
    tag: string | null;
    favorites: boolean;
    sort: SortValue;
};

export type TagCount = { tag: string; count: number };

function args(q: NotesQuery) {
    return {
        p_query: q.query.trim() || null,
        p_tag: q.tag,
        p_favorites: q.favorites,
        p_sort: q.sort,
    };
}

export async function fetchNotesPage(
    supabase: SupabaseClient,
    q: NotesQuery,
    page: number,
    signal?: AbortSignal,
): Promise<Note[]> {
    let req = supabase.rpc('search_notes', {
        ...args(q),
        p_limit: PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
    });
    if (signal) req = req.abortSignal(signal);

    const { data, error } = await req;
    if (error) throw error;
    return (data ?? []) as Note[];
}

/**
 * Split out from the page query on purpose — see the note in 0008. Folding the
 * total into each page with a window function made page one 60x slower, because
 * counting means visiting every matching row before LIMIT can discard them.
 * This is called once when the filters change, not once per scroll.
 */
export async function fetchNotesCount(
    supabase: SupabaseClient,
    q: NotesQuery,
    signal?: AbortSignal,
): Promise<number> {
    let req = supabase.rpc('count_notes', args(q));
    if (signal) req = req.abortSignal(signal);

    const { data, error } = await req;
    if (error) throw error;
    return Number(data ?? 0);
}

export async function fetchTagCounts(
    supabase: SupabaseClient,
): Promise<TagCount[]> {
    const { data, error } = await supabase.rpc('note_tags');
    if (error) throw error;
    return (data ?? []) as TagCount[];
}
