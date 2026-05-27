'use client';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine'; // Changed to mantine!
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css'; // Changed to mantine!
import { createClient } from '@/lib/supabase/client';

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

    const editor = useCreateBlockNote({
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

    return (
        <div className="border-border-/50 min-h-[200px] w-full overflow-hidden rounded-xl border bg-card transition-colors focus-within:border-primary/50">
            <BlockNoteView
                editor={editor}
                theme="dark"
                onChange={() => {
                    // Save the exact lossless JSON state!
                    const jsonString = JSON.stringify(editor.document);
                    onChange(jsonString);
                }}
            />
        </div>
    );
}
