'use client';

import { FilePlus } from 'lucide-react';
import CreateNoteModal from './CreateNoteModal';

export default function NewNoteButton() {
    return (
        <CreateNoteModal>
            <button className="btn-spectrum sheen flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-md shadow-[hsl(var(--spectrum-violet))]/25">
                <FilePlus size={15} />
                <span className="hidden sm:inline">New Note</span>
            </button>
        </CreateNoteModal>
    );
}
