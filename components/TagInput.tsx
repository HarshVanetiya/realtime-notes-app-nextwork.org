'use client';

import { useId, useMemo, useState } from 'react';
import { X, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MAX_TAGS, normalizeTag, parseTags } from '@/lib/note-tags';

export default function TagInput({
    value,
    onChange,
    suggestions = [],
}: {
    value: string[];
    onChange: (tags: string[]) => void;
    suggestions?: string[];
}) {
    const [draft, setDraft] = useState('');
    const listId = useId();
    const inputId = useId();

    const atLimit = value.length >= MAX_TAGS;

    const unusedSuggestions = useMemo(
        () => suggestions.filter((s) => !value.includes(s)).slice(0, 20),
        [suggestions, value],
    );

    function commit(raw: string) {
        if (atLimit) return;
        const next = [...value];
        for (const tag of parseTags(raw)) {
            if (next.length >= MAX_TAGS) break;
            if (!next.includes(tag)) next.push(tag);
        }
        if (next.length !== value.length) onChange(next);
        setDraft('');
    }

    function remove(tag: string) {
        onChange(value.filter((t) => t !== tag));
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter' || e.key === ',') {
            // Enter would otherwise submit the surrounding note form.
            e.preventDefault();
            if (draft.trim()) commit(draft);
            return;
        }
        if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            remove(value[value.length - 1]);
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-3">
                <label
                    htmlFor={inputId}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                    Tags
                </label>
                {value.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                        {value.length}/{MAX_TAGS}
                    </span>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-card p-2 transition-colors focus-within:border-primary/50">
                <TagIcon
                    size={15}
                    className="ml-1 flex-shrink-0 text-muted-foreground"
                />

                {value.map((tag) => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 py-1 pl-2.5 pr-1 font-medium"
                    >
                        <span className="break-all">{tag}</span>
                        <button
                            type="button"
                            onClick={() => remove(tag)}
                            aria-label={`Remove tag ${tag}`}
                            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <X size={12} />
                        </button>
                    </Badge>
                ))}

                <input
                    id={inputId}
                    list={listId}
                    value={draft}
                    disabled={atLimit}
                    onChange={(e) => {
                        // A datalist pick or a paste arrives whole, not keystroke
                        // by keystroke, so commit it here rather than on Enter.
                        const v = e.target.value;
                        if (v.includes(',') || unusedSuggestions.includes(v)) {
                            commit(v);
                        } else {
                            setDraft(v);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => draft.trim() && commit(draft)}
                    placeholder={
                        atLimit
                            ? `Limit of ${MAX_TAGS} tags reached`
                            : value.length
                              ? 'Add another...'
                              : 'Add tags — press Enter after each'
                    }
                    className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 disabled:cursor-not-allowed"
                />
                <datalist id={listId}>
                    {unusedSuggestions.map((s) => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
            </div>

            {draft && normalizeTag(draft) !== draft.trim().toLowerCase() && (
                <p className="text-xs text-muted-foreground">
                    Will be saved as{' '}
                    <span className="font-medium text-foreground">
                        {normalizeTag(draft) || '—'}
                    </span>
                </p>
            )}
        </div>
    );
}
