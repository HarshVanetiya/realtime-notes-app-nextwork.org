'use client';

import { FilePlus } from 'lucide-react';
import CreateNoteModal from './CreateNoteModal';

export default function NewNoteButton() {
    return (
        <CreateNoteModal>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-95 transition-all duration-150">
                <FilePlus size={15} />
                <span className="hidden sm:inline">New Note</span>
            </button>
        </CreateNoteModal>
    );
}
