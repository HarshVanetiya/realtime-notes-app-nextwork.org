'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SORT_OPTIONS, type SortValue } from '@/lib/note-tags';

export default function NoteToolbar({
    tags,
    activeTag,
    sort,
}: {
    tags: { tag: string; count: number }[];
    activeTag: string | null;
    sort: SortValue;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Filter state lives in the URL, like the existing ?filter=favorites, so
    // views stay shareable and the back button works.
    function withParam(key: string, value: string | null) {
        const params = new URLSearchParams(searchParams.toString());
        if (value === null) params.delete(key);
        else params.set(key, value);
        const qs = params.toString();
        return qs ? `${pathname}?${qs}` : pathname;
    }

    function go(key: string, value: string | null) {
        router.push(withParam(key, value), { scroll: false });
    }

    const activeSort =
        SORT_OPTIONS.find((o) => o.value === sort) ?? SORT_OPTIONS[0];

    const chip =
        'flex-shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    const chipOn = 'border-primary/50 bg-primary/15 text-primary-text';
    const chipOff =
        'border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground';

    return (
        <div className="mb-4 flex items-center gap-3">
            {/* Scrolls rather than widening the page once tags accumulate. */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                <button
                    onClick={() => go('tag', null)}
                    aria-pressed={!activeTag}
                    className={`${chip} ${!activeTag ? chipOn : chipOff}`}
                >
                    All
                </button>
                {tags.map(({ tag, count }) => {
                    const on = activeTag === tag;
                    return (
                        <button
                            key={tag}
                            onClick={() => go('tag', on ? null : tag)}
                            aria-pressed={on}
                            className={`${chip} ${on ? chipOn : chipOff}`}
                        >
                            {tag}
                            {/* No opacity here. At 60% over the chip's own
                                background the count fell below the AA contrast
                                threshold — axe caught it once a fixture
                                rendered the chips with real counts. The
                                tabular figures and the position already read
                                as secondary without dimming them. */}
                            <span className="ml-1.5 tabular-nums">
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        aria-label={`Sort: ${activeSort.label}`}
                        className="flex h-9 flex-shrink-0 items-center gap-2 rounded-full border border-border/60 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <ArrowDownUp size={14} />
                        <span className="hidden sm:inline">
                            {activeSort.label}
                        </span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                        value={sort}
                        onValueChange={(v) =>
                            go('sort', v === 'newest' ? null : v)
                        }
                    >
                        {SORT_OPTIONS.map((o) => (
                            <DropdownMenuRadioItem key={o.value} value={o.value}>
                                {o.label}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
