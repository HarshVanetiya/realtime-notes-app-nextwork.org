import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the real grid's columns and card rhythm so nothing shifts on load. */
export default function NotesGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div role="status" aria-label="Loading notes">
            <div className="mb-4 flex items-center gap-3">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
                <div className="flex-1" />
                <Skeleton className="h-9 w-28 rounded-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={i}
                        className="rounded-2xl border border-border/50 bg-background/50 p-4"
                        style={{ animationDelay: `${i * 40}ms` }}
                    >
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="mt-3 h-3 w-full" />
                        <Skeleton className="mt-2 h-3 w-5/6" />
                        <div className="mt-4 flex gap-1.5">
                            <Skeleton className="h-5 w-12 rounded-md" />
                            <Skeleton className="h-5 w-16 rounded-md" />
                        </div>
                        <Skeleton className="mt-4 h-3 w-16" />
                    </div>
                ))}
            </div>
        </div>
    );
}
