'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import NoteForm, { NoteData } from './NoteForm';
import { createClient } from '@/lib/supabase/client';

interface EditNoteModalProps {
    initialData: NoteData;
    /** Controlled mode: pass open + onOpenChange without children */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    /** Trigger mode: wrap a trigger element as children */
    children?: React.ReactNode;
}

export default function EditNoteModal({ children, open: controlledOpen, onOpenChange, initialData }: EditNoteModalProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);

    // Support both controlled and uncontrolled modes
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = (value: boolean) => {
        if (isControlled) {
            onOpenChange?.(value);
        } else {
            setInternalOpen(value);
            onOpenChange?.(value);
        }
    };

    useEffect(() => {
        async function getUser() {
            const supabase = createClient();
            const { data } = await supabase.auth.getClaims();
            if (data?.claims?.sub) {
                setUserId(data.claims.sub);
            }
        }
        getUser();
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {children && (
                <span onClick={(e) => {
                    e.stopPropagation();
                    setOpen(true);
                }}>
                    {children}
                </span>
            )}
            <DialogContent showCloseButton={false} className="max-w-2xl p-0 border-none bg-transparent shadow-none w-full gap-0" aria-describedby={undefined}>
                <DialogTitle className="sr-only">Edit Note</DialogTitle>
                {userId ? (
                    <NoteForm 
                        userId={userId} 
                        initialData={initialData} 
                        onSuccess={() => setOpen(false)} 
                        onCancel={() => setOpen(false)} 
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
