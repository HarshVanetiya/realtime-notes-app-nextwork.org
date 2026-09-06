// app/notes/layout.tsx
import AppSidebar from '@/components/app-sidebar';
import { Suspense } from 'react';

export default function NotesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background">
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

            <div
                id="main-content"
                className="flex min-w-0 flex-1 flex-col overflow-x-clip pt-14 lg:pt-0"
            >
                {children}
            </div>
        </div>
    );
}
