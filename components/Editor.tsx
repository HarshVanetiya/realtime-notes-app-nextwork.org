'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine'; // Changed to mantine!
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css'; // Changed to mantine!
import { createClient } from '@/lib/supabase/client';
import { useMemo } from 'react';
import { useTheme } from 'next-themes';

interface EditorProps {
    onChange: (html: string) => void;
    initialContent?: string;
    userId: string;
}

export default function Editor({
    onChange,
    initialContent,
    userId,
}: EditorProps) {
    const supabase = createClient();
    const { resolvedTheme } = useTheme();

    const editor = useCreateBlockNote({
        // The ProseMirror surface is role="textbox"; without a name it is an
        // unlabelled input to a screen reader.
        domAttributes: {
            editor: { 'aria-label': 'Note content' },
        },
        uploadFile: async (file: File) => {
            const fileExt = file.name.split('.').pop();
            const filePath = `${userId}/inline-${Date.now()}.${fileExt}`;

            const { error } = await supabase.storage
                .from('note-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data } = supabase.storage
                .from('note-images')
                .getPublicUrl(filePath);

            return data.publicUrl;
        },
    });

    useMemo(() => {
        if (!initialContent) return;

        try {
            const blocks = JSON.parse(initialContent);
            editor.replaceBlocks(editor.document, blocks);
        } catch (e) {
            async function loadOldHtml() {
                const blocks = await editor.tryParseHTMLToBlocks(initialContent as string);
                editor.replaceBlocks(editor.document, blocks);
            }
            loadOldHtml();
        }
    }, [initialContent, editor]);

    return (
        <div className="border-border/50 min-h-[200px] w-full min-w-0 overflow-hidden rounded-xl border bg-card transition-colors focus-within:border-primary/50">
            <BlockNoteView
                editor={editor}
                theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
                onChange={() => {
                    // Save the exact lossless JSON state!
                    const jsonString = JSON.stringify(editor.document);
                    onChange(jsonString);
                }}
            />
        </div>
    );
}
