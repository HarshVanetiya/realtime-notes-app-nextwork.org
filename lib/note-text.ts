/**
 * Note bodies are stored in two formats: the current BlockNote JSON document,
 * and the legacy HTML written by earlier versions of the editor. Both are
 * flattened to plain text here so previews and search share one parser.
 */

type BlockLike = {
    type?: string;
    text?: string;
    content?: BlockLike[];
    children?: BlockLike[];
};

function collectText(block: BlockLike, out: string[]) {
    if (Array.isArray(block.content)) {
        block.content.forEach((child) => {
            if (child.type === 'text' && child.text) {
                out.push(child.text);
            } else {
                collectText(child, out);
            }
        });
    }
    if (Array.isArray(block.children)) {
        block.children.forEach((child) => collectText(child, out));
    }
}

export function extractPlainText(content: string | null | undefined): string {
    if (!content) return '';

    try {
        const blocks = JSON.parse(content);
        if (!Array.isArray(blocks)) return '';

        const parts: string[] = [];
        blocks.forEach((block: BlockLike) => collectText(block, parts));
        return parts.join(' ').replace(/\s+/g, ' ').trim();
    } catch {
        // Legacy HTML notes: strip tags with a regex so server and client
        // produce identical output (no DOMParser, which server rendering lacks).
        return content
            .replace(/<[^>]*>/g, '')
            .replaceAll('&amp;', '&')
            .replaceAll('&lt;', '<')
            .replaceAll('&gt;', '>')
            .replaceAll('&quot;', '"')
            .replaceAll('&#39;', "'")
            .replace(/\s+/g, ' ')
            .trim();
    }
}
