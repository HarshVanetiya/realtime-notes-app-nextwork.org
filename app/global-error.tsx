'use client';

/**
 * The last resort: this replaces the root layout, so it renders its own <html>
 * and <body> and cannot rely on globals.css having loaded. Everything here is
 * inline for that reason.
 */
export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0b1020',
                    color: '#f8fafc',
                    fontFamily:
                        "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                    padding: '1.5rem',
                }}
            >
                <div style={{ maxWidth: 420, textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', margin: 0 }}>
                        The app failed to start
                    </h1>
                    <p
                        style={{
                            marginTop: '0.75rem',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            color: '#94a3b8',
                        }}
                    >
                        Your notes are stored on the server and are unaffected.
                        Reloading usually clears this.
                    </p>
                    {error.digest && (
                        <p
                            style={{
                                marginTop: '0.75rem',
                                fontSize: '0.75rem',
                                fontFamily: 'ui-monospace, monospace',
                                color: '#64748b',
                            }}
                        >
                            Reference: {error.digest}
                        </p>
                    )}
                    <button
                        onClick={reset}
                        style={{
                            marginTop: '1.5rem',
                            padding: '0.625rem 1.25rem',
                            borderRadius: '0.75rem',
                            border: 'none',
                            background: '#6366f1',
                            color: '#fff',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}
