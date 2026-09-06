import { cn } from '@/lib/utils';

/**
 * Content-shaped placeholder. A spinner says "something is happening"; a
 * skeleton says "this is what is arriving", which makes the wait read as
 * shorter and stops the layout jumping when the data lands.
 *
 * Animates background-position only — no layout or paint work per frame.
 */
export function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            aria-hidden
            className={cn(
                'rounded-md bg-muted/60 bg-[length:200%_100%] bg-gradient-to-r from-muted/60 via-muted/20 to-muted/60 motion-safe:animate-shimmer',
                className,
            )}
            {...props}
        />
    );
}
