// app/notes/layout.tsx
import AppSidebar from '@/components/app-sidebar';
import AmbientWash from '@/components/AmbientWash';
import CommandPalette from '@/components/CommandPalette';
import { Suspense } from 'react';

export default function NotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // `isolate` so the wash's negative z-index stays inside this stacking
        // context rather than sliding behind the page background entirely.
        <div className="relative isolate flex min-h-screen bg-background">
            {/* The dashboard was a flat slab of near-black. This is the same
                free wash the landing page uses — two soft radial gradients, no
                blur and no animation, so it costs one paint and nothing after
                that. `fixed` so it stays put while the note grid scrolls. */}
            <AmbientWash tone="violet" fixed strength="strong" />
            <a href="#main-content" className="skip-link">
                Skip to content
            </a>
            {/* Wrap the sidebar in Suspense so usePathname doesn't block the build */}
            <Suspense
                fallback={
                    <div className="hidden h-screen w-64 border-r border-border bg-sidebar lg:flex" />
                }
            >
                <AppSidebar />
            </Suspense>

            {/* Mounted at the layout so ⌘K works on the dashboard and on a
                note alike, and so it survives navigation between them. */}
            <Suspense fallback={null}>
                <CommandPalette />
            </Suspense>

            <div
                id="main-content"
                className="flex min-w-0 flex-1 flex-col overflow-x-clip pt-14 lg:pt-0"
            >
                {children}
            </div>
        </div>
    );
}
