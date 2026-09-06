'use client';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Note } from '@/lib/note-types';
import {
    enqueueCreate,
    enqueueUpdate,
    hydrateQueue,
    queueSnapshot,
    removeOp,
    type QueuedOp,
} from '@/lib/offline-queue';

/**
 * Every note write goes through here.
 *
 * The alternative was teaching each of the eleven `.from('notes')` call sites
 * about offline behaviour, which is eleven chances to get the queueing rules
 * subtly different. One module means one place where "did this fail because
 * the network is gone, or because the server said no?" is decided.
 *
 * The distinction matters: a genuine rejection (RLS denied it, a constraint
 * refused it) must surface as an error, because retrying it later will fail
 * exactly the same way. Only a transport failure is queued.
 */

export type WriteResult = { queued: boolean; error: string | null };

const OK: WriteResult = { queued: false, error: null };
const QUEUED: WriteResult = { queued: true, error: null };

type PgError = { message?: string; code?: string; details?: string };

/**
 * supabase-js reports a failed fetch as an error object with an empty `code`,
 * because PostgREST never answered and so there is no SQLSTATE to report. A
 * real rejection always carries one (`42501` for RLS, `23514` for a check
 * constraint, and so on). That, plus navigator.onLine, is the whole test.
 */
function isTransportFailure(error: PgError | null): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    if (!error) return false;
    if (error.code) return false;
    return /fetch|network|load failed|timeout|abort/i.test(error.message ?? '');
}

function message(error: PgError | null, fallback: string): string {
    return error?.message?.trim() || fallback;
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

export type NewNote = {
    user_id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    tags: string[];
};

/**
 * The id is generated here rather than by the database, which is what makes a
 * retry safe: the same note carries the same primary key whether it is written
 * now or replayed in an hour, so a flush that runs twice inserts once.
 */
export function newNoteId(): string {
    return crypto.randomUUID();
}

export async function createNote(
    supabase: SupabaseClient,
    note: NewNote,
    id: string = newNoteId(),
): Promise<WriteResult & { id: string }> {
    const row = { id, ...note };
    const { error } = await supabase.from('notes').insert(row);
    if (!error) return { ...OK, id };
    if (isTransportFailure(error)) {
        await enqueueCreate(row);
        return { ...QUEUED, id };
    }
    return { queued: false, error: message(error, 'Could not create the note.'), id };
}

export async function updateNote(
    supabase: SupabaseClient,
    id: string,
    patch: Record<string, unknown>,
): Promise<WriteResult> {
    const { error } = await supabase.from('notes').update(patch).eq('id', id);
    if (!error) return OK;
    if (isTransportFailure(error)) {
        await enqueueUpdate(id, patch);
        return QUEUED;
    }
    return { queued: false, error: message(error, 'Could not save the change.') };
}

/* ------------------------------------------------------------------ *
 * Replay
 * ------------------------------------------------------------------ */

export type FlushReport = {
    synced: number;
    /** Ops abandoned because replaying them will never succeed. */
    dropped: { id: string; reason: string }[];
    /** Ops left in the queue because the network is still unavailable. */
    remaining: number;
};

/** One flush at a time — `online` and the realtime reconnect often fire together. */
let inFlight: Promise<FlushReport> | null = null;

export function flushQueue(supabase: SupabaseClient): Promise<FlushReport> {
    if (!inFlight) {
        inFlight = runFlush(supabase).finally(() => {
            inFlight = null;
        });
    }
    return inFlight;
}

async function runFlush(supabase: SupabaseClient): Promise<FlushReport> {
    await hydrateQueue();
    const ops = queueSnapshot();
    const report: FlushReport = { synced: 0, dropped: [], remaining: 0 };

    for (const op of ops) {
        const outcome = await replay(supabase, op);
        if (outcome === 'synced') {
            await removeOp(op.id);
            report.synced++;
        } else if (outcome === 'retry') {
            // Still no network. Stop rather than grinding through the rest —
            // they will all fail the same way, and the order is preserved.
            report.remaining = queueSnapshot().length;
            return report;
        } else {
            await removeOp(op.id);
            report.dropped.push({ id: op.id, reason: outcome });
        }
    }

    report.remaining = queueSnapshot().length;
    return report;
}

async function replay(
    supabase: SupabaseClient,
    op: QueuedOp,
): Promise<'synced' | 'retry' | string> {
    if (op.op === 'create') {
        const { error } = await supabase.from('notes').insert(op.payload);
        if (!error) return 'synced';
        // 23505: the row is already there — an earlier flush landed and only
        // the acknowledgement was lost. The write succeeded, so this is done.
        if (error.code === '23505') return 'synced';
        if (isTransportFailure(error)) return 'retry';
        return message(error, 'the server rejected it');
    }

    // .select() so a patch against a row that no longer exists is visible:
    // PostgREST reports updating zero rows as a success, and silently doing
    // nothing is exactly how an edit to a note deleted on another device
    // would disappear without anyone noticing.
    const { data, error } = await supabase
        .from('notes')
        .update(op.payload)
        .eq('id', op.id)
        .select('id');

    if (error) {
        if (isTransportFailure(error)) return 'retry';
        return message(error, 'the server rejected it');
    }
    if (!data || data.length === 0) return 'the note no longer exists';
    return 'synced';
}

/* ------------------------------------------------------------------ *
 * Navigation
 * ------------------------------------------------------------------ */

/**
 * router.refresh() is not safe to call while offline.
 *
 * The refetch of the RSC payload fails, and Next.js falls back to a full
 * browser navigation — which, with no network, lands on the browser's own
 * "No internet" error page and throws the application away, queue and all.
 * Saving a note offline did exactly that until this existed.
 *
 * There is nothing to refresh anyway: the write is in the queue, the queue
 * drives the list, and the flush refreshes once the connection is back.
 */
export function refreshIfOnline(router: { refresh: () => void }) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    router.refresh();
}

/* ------------------------------------------------------------------ *
 * Display
 * ------------------------------------------------------------------ */

/**
 * Queued creates rendered as notes, so a note written offline appears in the
 * list straight away instead of vanishing until the connection returns.
 * Merged by id: once the real row arrives over realtime or a refresh, the
 * placeholder is the same note and drops out.
 */
export function mergePendingCreates(notes: Note[], ops: QueuedOp[]): Note[] {
    const known = new Set(notes.map((n) => n.id));
    const pending = ops
        .filter((op) => op.op === 'create' && !known.has(op.id))
        .map((op) => {
            const p = op.payload as Partial<Note>;
            return {
                id: op.id,
                user_id: String(p.user_id ?? ''),
                title: String(p.title ?? ''),
                content: p.content ?? null,
                image_url: p.image_url ?? null,
                is_favorite: Boolean(p.is_favorite),
                tags: p.tags ?? [],
                created_at: new Date(op.queuedAt).toISOString(),
                updated_at: null,
                deleted_at: p.deleted_at ?? null,
                is_public: false,
                public_slug: null,
            } satisfies Note;
        });
    return pending.length ? [...pending, ...notes] : notes;
}
