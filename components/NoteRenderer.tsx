'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { useMemo } from 'react';

export default function NoteRenderer({ content }: { content: string | null }) {
    // We use useMemo to only initialize the editor once with the correct data
    const editor = useCreateBlockNote({}, []);

    useMemo(() => {
        if (!content) return;

        try {
            // 1. Try to parse it as our new lossless JSON format
            const blocks = JSON.parse(content);
            editor.replaceBlocks(editor.document, blocks);
        } catch (e) {
            // 2. If JSON.parse fails, it must be an old note in HTML format!
            // BlockNote can intelligently convert old HTML back into blocks.
            async function loadOldHtml() {
                const blocks = await editor.tryParseHTMLToBlocks(
                    content as string,
                );
                editor.replaceBlocks(editor.document, blocks);
            }
            loadOldHtml();
        }
    }, [content, editor]);

    if (!content) return null;

    return (
        <div className="read-only-editor -ml-12 w-full">
            {/* -ml-12 offsets BlockNote's default left padding so it aligns flush with your UI */}
            <BlockNoteView
                editor={editor}
                theme="dark"
                editable={false} // This makes it read-only!
            />
        </div>
    );
}
