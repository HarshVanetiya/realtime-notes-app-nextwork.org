'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Globe, Link2, Loader2, Lock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-provider';

export default function ShareNoteDialog({
    noteId,
    isPublic: initialIsPublic,
    publicSlug: initialSlug,
    children,
}: {
    noteId: string;
    isPublic: boolean;
    publicSlug: string | null;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [isPublic, setIsPublic] = useState(initialIsPublic);
    const [slug, setSlug] = useState(initialSlug);
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const supabase = createClient();
    const toast = useToast();
    const router = useRouter();

    const url = slug
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/n/${slug}`
        : '';

    async function setShared(next: boolean) {
        // Not queued: the slug is minted by a database trigger, so there is no
        // link to show until the server has answered. Promising a URL that
        // does not exist yet would be worse than saying no.
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            toast.error('You\u2019re offline', {
                description: 'Sharing needs a connection to create the link.',
            });
            return;
        }
        setBusy(true);
        // The slug is minted and cleared by a database trigger, so the client
        // only ever flips the boolean — it cannot choose or keep a URL.
        const { data, error } = await supabase
            .from('notes')
            .update({ is_public: next })
            .eq('id', noteId)
            .select('is_public, public_slug')
            .single();
        setBusy(false);

        if (error) {
            toast.error(
                next ? 'Could not share note' : 'Could not stop sharing',
                { description: error.message },
            );
            return;
        }

        setIsPublic(data.is_public);
        setSlug(data.public_slug);
        router.refresh();
        toast.success(next ? 'Note is public' : 'Sharing turned off', {
            description: next
                ? 'Anyone with the link can read it.'
                : 'The old link no longer works.',
        });
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Could not copy', {
                description: 'Select the link and copy it manually.',
            });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>Share this note</DialogTitle>
                <DialogDescription>
                    Publishing creates an unguessable link. Only this note
                    becomes readable — nothing else in your account.
                </DialogDescription>

                <div className="mt-2 flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                    {isPublic ? (
                        <Globe size={18} className="mt-0.5 flex-shrink-0 text-primary-text" />
                    ) : (
                        <Lock size={18} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">
                            {isPublic ? 'Public' : 'Private'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {isPublic
                                ? 'Anyone with the link can read this note.'
                                : 'Only you can see this note.'}
                        </p>
                    </div>
                    <button
                        onClick={() => void setShared(!isPublic)}
                        disabled={busy}
                        className={`flex flex-shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-fast ease-standard disabled:opacity-60 ${
                            isPublic
                                ? 'border border-border text-foreground hover:bg-foreground/5'
                                : 'bg-primary text-primary-foreground hover:opacity-90'
                        }`}
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {isPublic ? 'Stop sharing' : 'Publish'}
                    </button>
                </div>

                {isPublic && slug && (
                    <div className="mt-3">
                        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
                            <Link2 size={15} className="flex-shrink-0 text-muted-foreground" />
                            <input
                                readOnly
                                value={url}
                                aria-label="Public link"
                                onFocus={(e) => e.currentTarget.select()}
                                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
                            />
                            <button
                                onClick={() => void copy()}
                                aria-label="Copy link"
                                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-fast ease-standard hover:bg-foreground/5 hover:text-foreground"
                            >
                                {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Turning sharing off permanently breaks this link.
                            Sharing again creates a different one.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
