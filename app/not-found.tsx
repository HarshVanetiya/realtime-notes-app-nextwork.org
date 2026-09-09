import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export const metadata = { title: 'Not found' };

export default function NotFound() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground/5">
                    <FileQuestion size={26} className="text-muted-foreground" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                    This page doesn&apos;t exist
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    The note may have been deleted, or a shared link may have
                    been revoked by its owner.
                </p>
                <Link
                    href="/notes"
                    className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity duration-fast ease-standard hover:opacity-90"
                >
                    Back to my notes
                </Link>
            </div>
        </main>
    );
}
