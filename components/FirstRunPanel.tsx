'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Loader2, PenLine, Sparkles, Tag } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-provider';
import { SAMPLE_NOTE, dismissOnboarding } from '@/lib/onboarding';
import CreateNoteModal from './CreateNoteModal';

const STEPS = [
    { icon: PenLine, title: 'Write', body: 'Rich text, lists, code and images.' },
    { icon: Tag, title: 'Tag', body: 'How you find things again later.' },
    { icon: Command, title: 'Jump', body: 'Press ⌘K to search or run a command.' },
];

export default function FirstRunPanel({
    userId,
    onDismiss,
}: {
    userId: string;
    /** Lets the list drop the panel immediately. Writing the localStorage flag
     *  alone would leave it on screen until the next navigation. */
    onDismiss: () => void;
}) {
    const [seeding, setSeeding] = useState(false);
    const supabase = createClient();
    const toast = useToast();
    const router = useRouter();

    async function addSample() {
        setSeeding(true);
        const { error } = await supabase.from('notes').insert({
            user_id: userId,
            title: SAMPLE_NOTE.title,
            content: SAMPLE_NOTE.content,
            tags: SAMPLE_NOTE.tags,
            image_url: null,
        });
        setSeeding(false);

        if (error) {
            toast.error('Could not add the sample note', {
                description: error.message,
            });
            return;
        }
        dismissOnboarding();
        onDismiss();
        router.refresh();
        toast.success('Sample note added', {
            description: 'Edit or delete it like any other note.',
        });
    }

    return (
        <div className="mt-4 overflow-hidden rounded-3xl border border-border/50 bg-card/60">
            <div className="px-6 py-10 text-center sm:px-10 sm:py-14">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles size={26} className="text-primary-text" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Welcome to Slate
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    A place for notes that sync live across your devices. Start
                    with a sample note to see what it can do, or go straight to a
                    blank page.
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                        onClick={() => void addSample()}
                        disabled={seeding}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity duration-fast ease-standard hover:opacity-90 disabled:opacity-60 sm:w-auto"
                    >
                        {seeding && <Loader2 size={15} className="animate-spin" />}
                        Add a sample note
                    </button>
                    <CreateNoteModal>
                        <button
                            // Persist the flag but stay mounted: onDismiss()
                            // here would unmount this panel — and with it the
                            // CreateNoteModal wrapping this button — before the
                            // dialog could open. The panel goes once a note
                            // actually exists, or on the next visit.
                            onClick={dismissOnboarding}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-fast ease-standard hover:border-primary/40 sm:w-auto"
                        >
                            Write my own
                        </button>
                    </CreateNoteModal>
                </div>
            </div>

            <ul className="grid grid-cols-1 gap-px border-t border-border/50 bg-border/50 sm:grid-cols-3">
                {STEPS.map(({ icon: Icon, title, body }) => (
                    <li key={title} className="bg-card/60 px-6 py-5">
                        <div className="flex items-center gap-2">
                            <Icon size={15} className="text-primary-text" />
                            <h3 className="text-sm font-semibold text-foreground">
                                {title}
                            </h3>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {body}
                        </p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
