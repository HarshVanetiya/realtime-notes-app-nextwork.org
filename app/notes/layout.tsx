// app/notes/layout.tsx
import AppSidebar from '@/components/app-sidebar';
import PreferencesSync from '@/components/preferences-sync';
import PreferencesDialog from '@/components/PreferencesDialog';
import BookmarkDrawer from '@/components/BookmarkDrawer';
import { createClient } from '@/lib/supabase/server';
import CommandPalette from '@/components/CommandPalette';
import { Suspense } from 'react';

/** Uncached auth access, so it lives inside its own Suspense boundary. */
async function PreferencesGate() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub ?? null;
    return (
        <>
            <PreferencesSync userId={userId} />
            <PreferencesDialog userId={userId} />
            <BookmarkDrawer userId={userId} />
        </>
    );
}

export default function NotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // `isolate` so the wash's negative z-index stays inside this stacking
        // context rather than sliding behind the page background entirely.
        <div className="relative isolate flex min-h-screen bg-background">
            {/* No ambient wash. The base is matte on purpose — a flat
                desaturated gray, with colour arriving only from the accent the
                user picked. A gradient here is exactly what "no gloss, no
                gradient" rules out. */}
            <Suspense fallback={null}>
                <PreferencesGate />
            </Suspense>
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
