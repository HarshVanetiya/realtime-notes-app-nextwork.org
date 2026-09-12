'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Bookmark, BookmarkFolder } from '@/lib/bookmark-types';

/**
 * Every bookmark write from the app goes through here. No offline queue: a
 * bookmark is saved in one gesture, not edited while typing, so a failed
 * save is something to tell the user about, not something to replay later.
 */

export type Result = { error: string | null };
const OK: Result = { error: null };

type PgError = { message?: string; code?: string };

function fail(error: PgError, fallback: string): Result {
    return { error: error.message?.trim() || fallback };
}

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

export async function fetchBookmarkData(supabase: SupabaseClient): Promise<{
    folders: BookmarkFolder[];
    bookmarks: Bookmark[];
    error: string | null;
}> {
    const [f, b] = await Promise.all([
        supabase
            .from('bookmark_folders')
            .select('*')
            .order('position', { ascending: true })
            .order('created_at', { ascending: true }),
        supabase
            .from('bookmarks')
            .select('*')
            .order('position', { ascending: true })
            .order('created_at', { ascending: true }),
    ]);
    const error = f.error ?? b.error;
    return {
        folders: (f.data ?? []) as BookmarkFolder[],
        bookmarks: (b.data ?? []) as Bookmark[],
        error: error ? error.message : null,
    };
}

/* ------------------------------------------------------------------ *
 * Bookmarks
 * ------------------------------------------------------------------ */

export const DUPLICATE_URL = 'duplicate';

export async function createBookmark(
    supabase: SupabaseClient,
    input: { user_id: string; title: string; url: string; folder_id?: string | null },
): Promise<Result> {
    const { error } = await supabase.from('bookmarks').insert({
        user_id: input.user_id,
        title: input.title.trim(),
        url: input.url.trim(),
        folder_id: input.folder_id ?? null,
    });
    if (!error) return OK;
    // 23505 = unique violation, i.e. the (user_id, url) index.
    if (error.code === '23505') return { error: DUPLICATE_URL };
    return fail(error, 'Could not save bookmark');
}

export async function renameBookmark(
    supabase: SupabaseClient,
    id: string,
    title: string,
): Promise<Result> {
    const { error } = await supabase
        .from('bookmarks')
        .update({ title: title.trim() })
        .eq('id', id);
    return error ? fail(error, 'Could not rename bookmark') : OK;
}

export async function moveBookmark(
    supabase: SupabaseClient,
    id: string,
    folderId: string | null,
): Promise<Result> {
    const { error } = await supabase
        .from('bookmarks')
        .update({ folder_id: folderId })
        .eq('id', id);
    return error ? fail(error, 'Could not move bookmark') : OK;
}

export async function deleteBookmark(
    supabase: SupabaseClient,
    id: string,
): Promise<Result> {
    const { error } = await supabase.from('bookmarks').delete().eq('id', id);
    return error ? fail(error, 'Could not delete bookmark') : OK;
}

/* ------------------------------------------------------------------ *
 * Folders
 * ------------------------------------------------------------------ */

export async function createFolder(
    supabase: SupabaseClient,
    input: { user_id: string; name: string },
): Promise<Result & { id: string | null }> {
    const { data, error } = await supabase
        .from('bookmark_folders')
        .insert({ user_id: input.user_id, name: input.name.trim() })
        .select('id')
        .single();
    if (error) return { ...fail(error, 'Could not create folder'), id: null };
    return { ...OK, id: data.id as string };
}

export async function renameFolder(
    supabase: SupabaseClient,
    id: string,
    name: string,
): Promise<Result> {
    const { error } = await supabase
        .from('bookmark_folders')
        .update({ name: name.trim() })
        .eq('id', id);
    return error ? fail(error, 'Could not rename folder') : OK;
}

/** Bookmarks inside fall back to the top level — that is what ON DELETE SET NULL does. */
export async function deleteFolder(
    supabase: SupabaseClient,
    id: string,
): Promise<Result> {
    const { error } = await supabase.from('bookmark_folders').delete().eq('id', id);
    return error ? fail(error, 'Could not delete folder') : OK;
}
