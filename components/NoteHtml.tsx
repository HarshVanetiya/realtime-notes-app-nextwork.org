// Block layout + theming only. The 32 KB of Mantine editor chrome
// (toolbars, slash menu, side menu) is deliberately not imported — nothing on
// the read path can use it.
import '@blocknote/core/style.css';
import '@blocknote/mantine/blocknoteStyles.css';

/**
 * Renders note HTML produced by lib/note-html.ts, reproducing the wrapper
 * BlockNoteView would have rendered so the existing stylesheets apply.
 *
 * Deliberately not a Client Component: BlockNote's palette is remapped onto the
 * app's own theme tokens in globals.css, so colors follow the `.dark` class on
 * <html> with no JavaScript, no theme-detection hook and no flash of the wrong
 * palette before hydration.
 */
export default function NoteHtml({ html }: { html: string }) {
    if (!html) return null;

    return (
        <div className="read-only-editor w-full min-w-0">
            <div className="bn-root bn-container">
                <div
                    className="bn-editor bn-default-styles"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
        </div>
    );
}
