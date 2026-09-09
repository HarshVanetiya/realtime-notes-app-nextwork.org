import { createClient } from '@/lib/supabase/server';
import { renderNoteMarkdown } from '@/lib/note-html';

/**
 * Markdown export — one note with ?id=, or everything without it.
 *
 * A route handler rather than a client-side download: the body has to be
 * serialized through @blocknote/server-util, which is server-only, and doing
 * it here means the export never ships the editor to the browser.
 *
 * RLS does the authorisation. This uses the request's own session, so the
 * query can only ever return notes the caller already owns — there is no
 * elevated key anywhere in this path.
 */
export async function GET(request: Request) {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims?.sub) {
        return new Response('Not signed in', { status: 401 });
    }

    const id = new URL(request.url).searchParams.get('id');

    let query = supabase
        .from('notes')
        .select('id, title, content, tags, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

    if (id) query = query.eq('id', id);

    const { data: notes, error } = await query;

    if (error) {
        return new Response(`Could not read your notes: ${error.message}`, {
            status: 502,
        });
    }
    if (!notes || notes.length === 0) {
        return new Response('No notes to export', { status: 404 });
    }

    const parts: string[] = [];
    for (const note of notes) {
        const body = await renderNoteMarkdown(note.content);
        const tags = (note.tags ?? []) as string[];
        parts.push(
            [
                `# ${note.title}`,
                '',
                `*${new Date(note.created_at).toISOString().slice(0, 10)}*` +
                    (tags.length ? ` — ${tags.map((t) => `\`${t}\``).join(' ')}` : ''),
                '',
                body,
            ].join('\n'),
        );
    }

    // Separated by a rule so a multi-note export is still one readable file
    // rather than a zip the browser has to be trusted to unpack.
    const markdown = parts.join('\n\n---\n\n');

    const filename = id
        ? `${slugify(notes[0].title)}.md`
        : `slate-notes-${new Date().toISOString().slice(0, 10)}.md`;

    return new Response(markdown, {
        headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
            // Notes are private; nothing about this belongs in a shared cache.
            'Cache-Control': 'private, no-store',
        },
    });
}

function slugify(title: string): string {
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
    return slug || 'note';
}
