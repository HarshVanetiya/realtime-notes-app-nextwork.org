/**
 * First-run helpers.
 *
 * The sample note is inserted through the ordinary path, so it is a real note:
 * editable, taggable, deletable, and it syncs like any other. A hard-coded
 * fixture would teach the wrong thing the moment someone tried to change it.
 */

// Deliberately still `slate:` after the rename to Prism. This key is an
// internal identifier, not a label — renaming it would make every existing
// user's browser forget they had been onboarded and show them the
// first-run panel again. Cosmetic tidiness is not worth resetting state
// that lives on someone else's machine.
const DISMISSED_KEY = 'slate:onboarding-dismissed';

export function hasDismissedOnboarding(): boolean {
    try {
        return localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
        // Private mode or blocked storage: treat as not dismissed rather than
        // throwing. Showing the panel twice is better than crashing the page.
        return false;
    }
}

export function dismissOnboarding() {
    try {
        localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
        /* nothing to do — the panel will simply appear again */
    }
}

const t = (text: string, styles: Record<string, boolean> = {}) => ({
    type: 'text',
    text,
    styles,
});

/** Demonstrates the block types people are least likely to discover alone. */
export const SAMPLE_NOTE = {
    title: 'Welcome to Prism',
    tags: ['welcome', 'getting-started'],
    content: JSON.stringify([
        {
            id: 'w1',
            type: 'heading',
            props: { level: 2 },
            content: [t('This is a real note')],
        },
        {
            id: 'w2',
            type: 'paragraph',
            content: [
                t('Edit it, tag it, or delete it — nothing here is special. Try '),
                t('bold', { bold: true }),
                t(' and '),
                t('italic', { italic: true }),
                t(' text, or type '),
                t('/', { code: true }),
                t(' in the editor for headings, lists and code.'),
            ],
        },
        {
            id: 'w3',
            type: 'heading',
            props: { level: 3 },
            content: [t('Three things worth knowing')],
        },
        {
            id: 'w4',
            type: 'bulletListItem',
            content: [
                t('Press '),
                t('⌘K', { code: true }),
                t(' anywhere to search notes, jump to a tag, or run a command.'),
            ],
        },
        {
            id: 'w5',
            type: 'bulletListItem',
            content: [
                t('Tags are how you find things later. This note has two.'),
            ],
        },
        {
            id: 'w6',
            type: 'bulletListItem',
            content: [
                t('Deleting is undoable — notes rest in Trash until you empty it.'),
            ],
        },
        {
            id: 'w7',
            type: 'paragraph',
            content: [t('Notes sync live across every tab you have open.')],
        },
        {
            id: 'w8',
            type: 'codeBlock',
            props: { language: 'javascript' },
            content: [t("// Code blocks work too\nconst notes = await slate.all();")],
        },
    ]),
};
