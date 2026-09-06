'use client';

/**
 * A durable queue of writes made while the app could not reach Supabase.
 *
 * IndexedDB rather than localStorage because the queue has to survive a tab
 * crash and a browser restart, and because localStorage is synchronous — a
 * queue flushed on the `online` event should not block the main thread.
 * It is written directly, at about a hundred lines, rather than pulling in a
 * wrapper library for one object store.
 *
 * The central invariant is **at most one queued entry per note**, keyed by the
 * note's id:
 *
 *   - a create holds the whole row, so replaying it is a single insert;
 *   - an update holds a merged patch;
 *   - an update to a note whose create is still queued merges into that create,
 *     so a note written and then edited offline syncs as one insert rather than
 *     an insert racing an update against a row that does not exist yet.
 *
 * That invariant is what makes replay order irrelevant and makes a duplicate
 * flush harmless.
 */

const DB_NAME = 'slate-offline';
const DB_VERSION = 1;
const STORE = 'ops';

export type QueuedOp = {
    /** The note's id — client-generated for creates, so a retry cannot
     *  double-insert. Also the store's key, which enforces one op per note. */
    id: string;
    op: 'create' | 'update';
    payload: Record<string, unknown>;
    queuedAt: number;
};

/* ------------------------------------------------------------------ *
 * Storage
 * ------------------------------------------------------------------ */

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        if (typeof indexedDB === 'undefined') return resolve(null);
        let request: IDBOpenDBRequest;
        try {
            request = indexedDB.open(DB_NAME, DB_VERSION);
        } catch {
            // Some privacy modes throw on open rather than failing the request.
            return resolve(null);
        }
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        // A blocked or failed open must not take the app down with it: the
        // caller falls back to reporting the write as failed, which is the
        // behaviour from before this queue existed.
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
    });
    return dbPromise;
}

function tx<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
    return openDb().then(
        (db) =>
            new Promise((resolve) => {
                if (!db) return resolve(null);
                try {
                    const request = run(db.transaction(STORE, mode).objectStore(STORE));
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                } catch {
                    resolve(null);
                }
            }),
    );
}

/* ------------------------------------------------------------------ *
 * In-memory mirror
 *
 * useSyncExternalStore needs a synchronous snapshot with a stable identity,
 * and IndexedDB is asynchronous, so the queue is mirrored in memory and the
 * mirror is what components read.
 * ------------------------------------------------------------------ */

let cache: QueuedOp[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((fn) => fn());
}

function setCache(next: QueuedOp[]) {
    cache = next.sort((a, b) => a.queuedAt - b.queuedAt);
    emit();
}

/** Loads the persisted queue into the mirror. Safe to call repeatedly. */
export async function hydrateQueue(): Promise<QueuedOp[]> {
    const all = await tx<QueuedOp[]>('readonly', (s) => s.getAll() as IDBRequest<QueuedOp[]>);
    loaded = true;
    setCache(all ?? []);
    return cache;
}

export function subscribeQueue(onChange: () => void): () => void {
    listeners.add(onChange);
    if (!loaded) void hydrateQueue();
    return () => listeners.delete(onChange);
}

export function queueSnapshot(): QueuedOp[] {
    return cache;
}

/** Server snapshot for useSyncExternalStore — nothing is queued on the server. */
const EMPTY: QueuedOp[] = [];
export function queueServerSnapshot(): QueuedOp[] {
    return EMPTY;
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

async function put(entry: QueuedOp) {
    await tx('readwrite', (s) => s.put(entry));
    setCache([...cache.filter((e) => e.id !== entry.id), entry]);
}

export async function enqueueCreate(note: Record<string, unknown> & { id: string }) {
    await put({ id: note.id, op: 'create', payload: note, queuedAt: Date.now() });
}

export async function enqueueUpdate(id: string, patch: Record<string, unknown>) {
    if (!loaded) await hydrateQueue();
    const existing = cache.find((e) => e.id === id);
    if (existing) {
        // Merge rather than append. A queued create absorbs the edit, so the
        // note still syncs as one insert; a queued update absorbs it as
        // last-write-wins, which is the same rule the server would apply.
        await put({
            ...existing,
            payload: { ...existing.payload, ...patch },
        });
        return;
    }
    await put({ id, op: 'update', payload: patch, queuedAt: Date.now() });
}

export async function removeOp(id: string) {
    await tx('readwrite', (s) => s.delete(id));
    setCache(cache.filter((e) => e.id !== id));
}

/** Notes created offline that the server has never seen. */
export function pendingCreates(): QueuedOp[] {
    return cache.filter((e) => e.op === 'create');
}
