'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function NoteForm({ userId }: { userId: string }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const supabase = createClient();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setIsSubmitting(true);

        let imageUrl: string | null = null;

        if (imageFile) {
            const fileExt = imageFile.name.split('.').pop();
            const filePath = `${userId}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('note-images')
                .upload(filePath, imageFile);

            if (uploadError) {
                console.error('Error uploading image:', uploadError);
                setIsSubmitting(false);
                return;
            }

            const { data: urlData } = supabase.storage
                .from('note-images')
                .getPublicUrl(filePath);

            imageUrl = urlData.publicUrl;
        }

        const { error } = await supabase.from('notes').insert({
            user_id: userId,
            title: title.trim(),
            content: content.trim() || null,
            image_url: imageUrl,
        });

        if (error) {
            console.error('Error creating note:', error);
        } else {
            setTitle('');
            setContent('');
            setImageFile(null);
        }

        setIsSubmitting(false);
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mb-8 rounded-lg border bg-gray-50 p-4"
        >
            <h2 className="mb-4 text-lg font-semibold">Add a New Note</h2>
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Note title..."
                className="mb-3 w-full rounded border p-2"
                required
            />
            <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Note content (optional)..."
                className="mb-3 h-24 w-full resize-none rounded border p-2"
            />
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="mb-3 block"
            />
            <button
                type="submit"
                disabled={isSubmitting}
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
                {isSubmitting ? 'Adding...' : 'Add Note'}
            </button>
        </form>
    );
}
