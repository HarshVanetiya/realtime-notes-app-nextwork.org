'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { FileImage, X, Loader2, NotebookPen, ImagePlus } from 'lucide-react';
import TagInput from './TagInput';
import { collectTags } from '@/lib/note-tags';
import { useToast } from '@/components/toast-provider';
import { createNote, refreshIfOnline, updateNote } from '@/lib/notes-api';

const Editor = dynamic(() => import('./Editor'), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[200px] w-full items-center justify-center rounded-xl border border-border/50 bg-card">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
    ),
});

/**
 * Shared by CreateNoteModal and EditNoteModal.
 *
 * The width MUST be declared in the `sm:` modifier group. DialogContent merges
 * its base classes through tailwind-merge, and the base includes `sm:max-w-lg`;
 * a plain `max-w-*` here is a different modifier group, so it is not treated as
 * a conflict, survives the merge, and then loses to `sm:max-w-lg` in the
 * compiled CSS. That is how the modal ended up 512px wide while the code said
 * `max-w-2xl`.
 *
 * `w-[calc(100%-2rem)]` restores the phone gutter: tailwind-merge dropped the
 * base `max-w-[calc(100%-2rem)]` as a conflict, leaving the modal edge-to-edge.
 */
export const NOTE_DIALOG_CLASS =
    'w-[calc(100%-2rem)] sm:w-full sm:max-w-[min(60vw,896px)] p-0 border-none bg-transparent shadow-none gap-0';

export type NoteData = {
    id: string;
    title: string;
    content: string | null;
    image_url: string | null;
    tags?: string[] | null;
};

const TITLE_MAX_LENGTH = 200;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB — phone cameras easily exceed this.

export default function NoteForm({ userId, onSuccess, onCancel, initialData }: { userId: string, onSuccess?: () => void, onCancel?: () => void, initialData?: NoteData }) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
    const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const supabase = createClient();
    const router = useRouter();
    const toast = useToast();

    useEffect(() => {
        let cancelled = false;
        async function loadTags() {
            const { data } = await supabase
                .from('notes')
                .select('tags')
                .is('deleted_at', null);
            if (cancelled || !data) return;
            setTagSuggestions(collectTags(data).map((t) => t.tag));
        }
        loadTags();
        return () => {
            cancelled = true;
        };
        // supabase client is recreated per render; the fetch is one-shot on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function handleFileSelect(file: File | null) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setImageError('That file is not an image.');
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            setImageError(
                `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose one under 5 MB.`,
            );
            return;
        }

        setImageError(null);
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (e) => setImagePreview(e.target?.result as string);
        reader.readAsDataURL(file);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    }

    function removeImage() {
        setImageFile(null);
        setImagePreview(null);
        setImageError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) return;

        setSubmitError(null);
        setIsSubmitting(true);

        try {
            let imageUrl = initialData?.image_url || null;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const filePath = `${userId}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('note-images')
                    .upload(filePath, imageFile);

                if (uploadError) {
                    // Storage has no queue: bytes cannot be replayed from
                    // IndexedDB without holding the whole file, so an image
                    // added offline fails here rather than pretending.
                    throw new Error(
                        typeof navigator !== 'undefined' && !navigator.onLine
                            ? 'Images can\u2019t be uploaded while offline. Remove the image to save the rest of the note now.'
                            : uploadError.message,
                    );
                }

                const { data: urlData } = supabase.storage
                    .from('note-images')
                    .getPublicUrl(filePath);

                imageUrl = urlData.publicUrl;
            } else if (imagePreview === null) {
                // If they explicitly removed the image
                imageUrl = null;
            }

            const fields = {
                title: title.trim(),
                content: content.trim() || null,
                image_url: imageUrl,
                tags,
            };

            const result = initialData?.id
                ? await updateNote(supabase, initialData.id, fields)
                : await createNote(supabase, { user_id: userId, ...fields });

            if (result.error) throw new Error(result.error);

            if (result.queued) {
                // Saved on this device, not on the server. Saying "Note
                // created" here would be a lie the user only discovers when
                // the note is missing from another device.
                toast.success('Saved offline', {
                    description: `\u201c${title.trim()}\u201d will sync when you reconnect.`,
                });
            } else {
                toast.success(
                    initialData?.id ? 'Note updated' : 'Note created',
                    { description: title.trim() },
                );
            }

            if (onSuccess) {
                refreshIfOnline(router);
                onSuccess();
            } else if (result.queued) {
                // A client-side push still works offline; refetching does not.
                router.push('/notes');
            } else {
                router.replace('/notes');
                router.refresh();
            }
        } catch (error) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : 'Unable to create note. Please try again.',
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    const titleNearLimit = title.length > TITLE_MAX_LENGTH - 40;

    return (
        <form onSubmit={handleSubmit} className="w-full min-w-0 space-y-6">
            {/* min-w-0: DialogContent is a grid, and a grid item defaults to
                `min-width: auto` = min-content. Without this, one unbreakable
                token anywhere in the editor (a URL, a long identifier in a code
                block) widens the whole form past the dialog and clips it. */}
            {/* Card wrapper */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                        <div className="flex items-baseline justify-between gap-3">
                            <label
                                htmlFor="note-title"
                                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                            >
                                Title <span className="text-destructive">*</span>
                            </label>
                            {titleNearLimit && (
                                <span className="text-xs tabular-nums text-muted-foreground">
                                    {title.length}/{TITLE_MAX_LENGTH}
                                </span>
                            )}
                        </div>
                        <input
                            id="note-title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Give your note a title..."
                            required
                            maxLength={TITLE_MAX_LENGTH}
                            className="
                                w-full bg-transparent text-lg sm:text-2xl font-bold text-foreground
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
                            initialContent={initialData?.content || undefined}
                            onChange={(html) => setContent(html)}
                        />
                    </div>

                    <TagInput
                        value={tags}
                        onChange={setTags}
                        suggestions={tagSuggestions}
                    />

                    {/* Image upload */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Attachment
                        </label>

                        {imagePreview ? (
                            <div className="relative rounded-xl overflow-hidden border border-border/50 group">
                                {/* Local FileReader data: URL — next/image
                                    cannot optimize these. */}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imagePreview}
                                    alt="Preview"
                                    className="w-full max-h-56 object-cover"
                                />
                                {/* Always reachable: a hover-only overlay is
                                    invisible and untappable on touch. */}
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-2 right-2 flex items-center gap-2 rounded-xl bg-destructive/90 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-destructive"
                                >
                                    <X size={14} />
                                    Remove
                                </button>
                            </div>
                        ) : (
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragOver(true);
                                }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                                className={`
                                    flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
                                    px-4 py-6 sm:px-6 sm:py-10 transition-all duration-200
                                    ${
                                        isDragOver
                                            ? 'border-primary/60 bg-primary/5 scale-[1.01]'
                                            : 'border-border/50'
                                    }
                                `}
                            >
                                {/* Tapping is the only option on a phone, so lead
                                    with the button and demote the drag hint. */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40 sm:w-auto"
                                >
                                    <ImagePlus size={16} className="text-primary-text" />
                                    Choose image
                                </button>
                                <p className="text-center text-xs text-muted-foreground">
                                    <span className="hidden sm:inline">
                                        {isDragOver
                                            ? 'Drop to attach'
                                            : 'or drag & drop — '}
                                    </span>
                                    PNG, JPG, WEBP up to 5 MB
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <FileImage size={12} />
                                    <span>Images only</span>
                                </div>
                            </div>
                        )}

                        {imageError && (
                            <p className="text-sm text-destructive">{imageError}</p>
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

                {submitError ? (
                    <div className="mx-4 sm:mx-6 mb-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {submitError}
                    </div>
                ) : null}

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 px-4 sm:px-6 py-4 border-t border-border/50 bg-muted/10">
                    <button
                        type="submit"
                        disabled={isSubmitting || !title.trim()}
                        className="
                            flex items-center justify-center gap-2 px-6 py-3 rounded-xl
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
                                {initialData ? 'Update Note' : 'Save Note'}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => onCancel ? onCancel() : router.push('/notes')}
                        disabled={isSubmitting}
                        className="px-5 py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-150"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </form>
    );
}
