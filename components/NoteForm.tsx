'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Editor from './Editor';
import { FileImage, X, Loader2, NotebookPen, Upload } from 'lucide-react';

export default function NoteForm({ userId }: { userId: string }) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();

    function handleFileSelect(file: File | null) {
        if (!file) return;
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleFileSelect(file);
        }
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setSubmitError(null);
        setIsSubmitting(true);

        try {
            let imageUrl: string | null = null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const filePath = `${userId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('note-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: urlData } = supabase.storage
                    .from('note-images')
                    .getPublicUrl(filePath);

                imageUrl = urlData.publicUrl;
            }

            const { error } = await supabase
                .from('notes')
                .insert({
                    user_id: userId,
                    title: title.trim(),
                    content: content.trim() || null,
                    image_url: imageUrl,
                })
                .select('id')
                .single();

            if (error) {
                throw error;
            }

            router.replace('/notes');
            router.refresh();
        } catch (error) {
            console.error('Error creating note:', error);
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : 'Unable to create note. Please try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card wrapper */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50 bg-muted/20">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <NotebookPen size={15} className="text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-foreground">
                            New Note
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Add a title, content, and optional image
                        </p>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your note a title..."
                            required
                            className="
                                w-full bg-transparent text-2xl font-bold text-foreground
                                placeholder:text-muted-foreground/40 outline-none
                                border-b border-border/40 pb-2 focus:border-primary/60
                                transition-colors duration-200
                            "
                        />
                    </div>

                    {/* Content (BlockNote) */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Content
                        </label>
                        <Editor
                            userId={userId}
                            onChange={(html) => setContent(html)}
                        />
                    </div>

                    {/* Image upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Attachment
                        </label>

                        {imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-border/50 group">
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full max-h-56 object-cover"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={removeImage}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/90 text-white text-sm font-medium hover:bg-destructive transition-colors"
                                    >
                                        <X size={14} />
                                        Remove image
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`
                                    flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                                    px-6 py-10 cursor-pointer transition-all duration-200
                                    ${
                                        isDragOver
                                            ? 'border-primary/60 bg-primary/5 scale-[1.01]'
                                            : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'
                                    }
                                `}
                            >
                                <div
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-primary/20' : 'bg-muted/60'}`}
                                >
                                    <Upload
                                        size={18}
                                        className={
                                            isDragOver
                                                ? 'text-primary'
                                                : 'text-muted-foreground'
                                        }
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-foreground">
                                        {isDragOver
                                            ? 'Drop to attach'
                                            : 'Drag & drop an image'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        or{' '}
                                        <span className="text-primary font-medium">
                                            click to browse
                                        </span>{' '}
                                        — PNG, JPG, WEBP
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
                                    <FileImage size={12} />
                                    <span>Images only</span>
                                </div>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                                handleFileSelect(e.target.files?.[0] ?? null)
                            }
                        />
                    </div>
                </div>
            </div>

            {submitError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {submitError}
                </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <button
                    type="submit"
                    disabled={isSubmitting || !title.trim()}
                    className="
                        flex items-center gap-2 px-6 py-2.5 rounded-xl
                        bg-primary text-primary-foreground text-sm font-semibold
                        hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100
                        transition-all duration-150
                    "
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 size={15} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <NotebookPen size={15} />
                            Save Note
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => router.push('/notes')}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-150"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
