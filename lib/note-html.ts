/**
 * Server-side rendering of note bodies to HTML.
 *
 * Displaying a note used to mount a live BlockNote editor in the browser —
 * roughly a megabyte of JavaScript to render static text. Serializing here
 * instead keeps the editor off the read path entirely.
 *
 * SERVER ONLY: pulls in jsdom via @blocknote/server-util. Never import this
 * from a Client Component.
 */
import { ServerBlockNoteEditor } from '@blocknote/server-util';

// Creating the editor spins up a jsdom document, so do it once per process
// rather than once per request.
let editor: ReturnType<typeof ServerBlockNoteEditor.create> | null = null;

function getEditor() {
    if (!editor) editor = ServerBlockNoteEditor.create();
    return editor;
}

/**
 * Handles both storage formats, matching the contract in lib/note-text.ts:
 * the current BlockNote JSON document, and the legacy HTML written by earlier
 * versions of the editor.
 *
 * Legacy HTML is parsed into the block model before being re-serialized, which
 * discards anything the schema doesn't recognise (script tags included) rather
 * than passing stored markup straight through.
 */
/**
 * Code blocks scroll horizontally. Inside the editor that is fine — the caret
 * scrolls them — but this output is static, so without a tab stop a keyboard
 * user cannot reach the overflowing part at all.
 */
function makeCodeBlocksFocusable(html: string): string {
    return html.replace(/<pre(?![^>]*tabindex)/g, '<pre tabindex="0"');
}

export async function renderNoteHtml(
    content: string | null | undefined,
): Promise<string> {
    if (!content) return '';

    const bn = getEditor();

    try {
        const blocks = JSON.parse(content);
        if (!Array.isArray(blocks) || blocks.length === 0) return '';
        return makeCodeBlocksFocusable(await bn.blocksToFullHTML(blocks));
    } catch {
        const blocks = await bn.tryParseHTMLToBlocks(content);
        if (blocks.length === 0) return '';
        return makeCodeBlocksFocusable(await bn.blocksToFullHTML(blocks));
    }
}
