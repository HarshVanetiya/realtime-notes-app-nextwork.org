/**
 * Tag rules live here so normalization can't drift between the input, the
 * filter chips and search. Same pure-helper shape as lib/note-text.ts.
 */

export const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 24;

/**
 * Folds the variants people actually type — "Work", "work ", "WORK", "my work"
 * — onto one canonical tag, so they don't become four entries in the filter row.
 */
export function normalizeTag(raw: string): string {
    return raw
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9_-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^[-_]+|[-_]+$/g, '')
        .slice(0, MAX_TAG_LENGTH);
}

/** Splits pasted or comma-separated input into distinct normalized tags. */
export function parseTags(raw: string): string[] {
    const out: string[] = [];
    for (const part of raw.split(',')) {
        const tag = normalizeTag(part);
        if (tag && !out.includes(tag)) out.push(tag);
    }
    return out;
}

/**
 * Tag -> number of notes carrying it, most used first then alphabetical.
 * Feeds both the filter chips and the input's suggestions.
 */
export function collectTags(
    notes: { tags?: string[] | null }[],
): { tag: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const note of notes) {
        for (const tag of note.tags ?? []) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const SORT_OPTIONS = [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'updated', label: 'Recently edited' },
    { value: 'title', label: 'Title A–Z' },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

export function isSortValue(v: string | null): v is SortValue {
    return !!v && SORT_OPTIONS.some((o) => o.value === v);
}

type Sortable = {
    title: string;
    created_at: string;
    updated_at?: string | null;
};

/** Rows predating the updated_at trigger fall back to created_at. */
export function sortNotes<T extends Sortable>(notes: T[], sort: SortValue): T[] {
    const byCreated = (n: T) => new Date(n.created_at).getTime();
    const byUpdated = (n: T) =>
        new Date(n.updated_at ?? n.created_at).getTime();

    const sorted = [...notes];
    switch (sort) {
        case 'oldest':
            return sorted.sort((a, b) => byCreated(a) - byCreated(b));
        case 'updated':
            return sorted.sort((a, b) => byUpdated(b) - byUpdated(a));
        case 'title':
            return sorted.sort((a, b) =>
                a.title.localeCompare(b.title, undefined, {
                    sensitivity: 'base',
                }),
            );
        case 'newest':
        default:
            return sorted.sort((a, b) => byCreated(b) - byCreated(a));
    }
}
