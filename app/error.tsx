'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Until this existed, any render error anywhere in the app produced a blank
 * white page — in production, without even a console message the user could
 * report. A boundary cannot fix the error, but it can keep the person in the
 * product and give them something to do next.
 */
export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // The digest is the only handle on a production error, where the real
        // message is stripped before it reaches the browser.
        console.error('Unhandled error', error.digest ?? '', error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <div className="w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 text-center">
                <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                    <AlertTriangle size={26} className="text-destructive" />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                    Something went wrong
                </h1>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Your notes are safe — this is a problem with the page, not
                    with your data.
                </p>
                {error.digest && (
                    <p className="mt-3 font-mono text-xs text-muted-foreground/70">
                        Reference: {error.digest}
                    </p>
                )}
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                    <button
                        onClick={reset}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity duration-fast ease-standard hover:opacity-90 sm:w-auto"
                    >
                        <RotateCcw size={15} />
                        Try again
                    </button>
                    <Link
                        href="/notes"
                        className="inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors duration-fast ease-standard hover:border-primary/40 sm:w-auto"
                    >
                        Back to my notes
                    </Link>
                </div>
            </div>
        </main>
    );
}
