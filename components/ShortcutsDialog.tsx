'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

// Grouped the way people look them up: "how do I do X", not by key.
const GROUPS: { heading: string; items: [string, string[]][] }[] = [
    {
        heading: 'Everywhere',
        items: [
            ['Open the command palette', ['⌘', 'K']],
            ['New note', ['⌘', 'N']],
            ['Open the bookmark drawer', ['⌘', 'B']],
            ['This dialog', ['?']],
            ['Close a dialog or palette', ['Esc']],
        ],
    },
    {
        heading: 'In the palette',
        items: [
            ['Move through results', ['↑', '↓']],
            ['Open the selection', ['↵']],
            ['Search the web instead', ['type', '↓', '↵']],
        ],
    },
    {
        heading: 'On the dashboard',
        items: [
            ['Move between notes and their actions', ['Tab']],
            ['Open the focused note', ['↵']],
            ['Open in a new tab', ['⌘', 'click']],
        ],
    },
];

export default function ShortcutsDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogTitle>Keyboard shortcuts</DialogTitle>
                <DialogDescription className="sr-only">
                    A list of keyboard shortcuts available in the app.
                </DialogDescription>

                <div className="space-y-6">
                    {GROUPS.map((group) => (
                        <div key={group.heading}>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {group.heading}
                            </h3>
                            <ul className="space-y-1.5">
                                {group.items.map(([label, keys]) => (
                                    <li
                                        key={label}
                                        className="flex items-center justify-between gap-4 text-sm"
                                    >
                                        <span className="min-w-0 text-foreground">
                                            {label}
                                        </span>
                                        <span className="flex flex-shrink-0 items-center gap-1">
                                            {keys.map((k) => (
                                                <kbd
                                                    key={k}
                                                    className="rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                                                >
                                                    {k}
                                                </kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
