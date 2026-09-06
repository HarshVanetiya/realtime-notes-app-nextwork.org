/**
 * One definition of a note row, shared by every component that handles them.
 *
 * NotesList and NoteCard previously each declared their own near-identical
 * shape, which diverged (NoteCard's lacked user_id) and made callbacks passed
 * between them structurally incompatible.
 */
export type Note = {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    is_favorite: boolean;
    /** null on rows fetched before the tags migration (0005). */
    tags: string[] | null;
    created_at: string;
    updated_at?: string | null;
    /** Non-null means trashed (0007). Live queries filter this. */
    deleted_at?: string | null;
};
