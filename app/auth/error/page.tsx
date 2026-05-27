import { Suspense } from "react";
import Link from "next/link";
import { NotebookPen, AlertTriangle } from "lucide-react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <p className="text-sm text-muted-foreground text-center leading-relaxed">
      {params?.error ? params.error : "An unspecified error occurred. Please try again."}
    </p>
  );
}

export default function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden bg-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-orange-500/5 blur-3xl" />
      </div>
      <div className="relative w-full max-w-sm animate-scale-in">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
              <NotebookPen size={22} className="text-white" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle size={30} className="text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
              <Suspense fallback={<p className="text-sm text-muted-foreground">Loading error details...</p>}>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </div>
            <Link
              href="/auth/login"
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
