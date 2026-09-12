'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import {
    ArrowLeft,
    Bookmark as BookmarkIcon,
    ExternalLink,
    Folder as FolderIcon,
    FolderInput,
    FolderPlus,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-provider';
import { useBookmarks } from '@/lib/use-bookmarks';
import {
    BOOKMARK_TITLE_MAX,
    FOLDER_NAME_MAX,
    faviconFor,
    hostnameOf,
    isBookmarkableUrl,
    type Bookmark,
    type BookmarkFolder,
} from '@/lib/bookmark-types';
import {
    DUPLICATE_URL,
    createBookmark,
    createFolder,
    deleteBookmark,
    deleteFolder,
    moveBookmark,
    renameBookmark,
    renameFolder,
} from '@/lib/bookmarks-api';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* ------------------------------------------------------------------ *
 * Prompt dialog — one component for "add bookmark", "add folder", and
 * both renames. They are all "one or two text fields and a Save button".
 * ------------------------------------------------------------------ */

type Prompt =
    | { kind: 'add-bookmark' }
    | { kind: 'add-folder' }
    | { kind: 'rename-bookmark'; bookmark: Bookmark }
    | { kind: 'rename-folder'; folder: BookmarkFolder };

function PromptDialog({
    prompt,
    onClose,
    onSubmit,
}: {
    prompt: Prompt | null;
    onClose: () => void;
    onSubmit: (prompt: Prompt, values: { primary: string; secondary: string }) => Promise<string | null>;
}) {
    const [primary, setPrimary] = useState('');
    const [secondary, setSecondary] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!prompt) return;
        setError(null);
        setBusy(false);
        if (prompt.kind === 'rename-bookmark') {
            setPrimary(prompt.bookmark.title);
            setSecondary('');
        } else if (prompt.kind === 'rename-folder') {
            setPrimary(prompt.folder.name);
            setSecondary('');
        } else {
            setPrimary('');
            setSecondary('');
        }
    }, [prompt]);

    if (!prompt) return null;

    const isAddBookmark = prompt.kind === 'add-bookmark';
    const isFolder = prompt.kind === 'add-folder' || prompt.kind === 'rename-folder';
    const title = {
        'add-bookmark': 'Add bookmark',
        'add-folder': 'New folder',
        'rename-bookmark': 'Rename bookmark',
        'rename-folder': 'Rename folder',
    }[prompt.kind];

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setBusy(true);
        const err = await onSubmit(prompt!, { primary, secondary });
        setBusy(false);
        if (err) {
            setError(err);
            return;
        }
        onClose();
    }

    return (
        <Dialog open onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription className="sr-only">{title}</DialogDescription>
                <form onSubmit={handleSubmit} className="space-y-3">
                    {isAddBookmark && (
                        <Input
                            autoFocus
                            type="url"
                            inputMode="url"
                            placeholder="https://…"
                            value={primary}
                            onChange={(e) => setPrimary(e.target.value)}
                            aria-label="URL"
                            required
                        />
                    )}
                    <Input
                        autoFocus={!isAddBookmark}
                        placeholder={isFolder ? 'Folder name' : isAddBookmark ? 'Title (optional)' : 'Title'}
                        value={isAddBookmark ? secondary : primary}
                        onChange={(e) =>
                            isAddBookmark ? setSecondary(e.target.value) : setPrimary(e.target.value)
                        }
                        maxLength={isFolder ? FOLDER_NAME_MAX : BOOKMARK_TITLE_MAX}
                        aria-label={isFolder ? 'Folder name' : 'Title'}
                        required={!isAddBookmark}
                    />
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}
                    <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/* ------------------------------------------------------------------ *
 * Tiles
 * ------------------------------------------------------------------ */

const TILE =
    'group/tile pressable relative flex w-full flex-col items-center gap-1.5 rounded-2xl p-2 text-center outline-none transition-colors hover:bg-foreground/[0.06] focus-visible:ring-2 focus-visible:ring-primary/50';
const ICON_BOX =
    'flex h-14 w-14 items-center justify-center overflow-hidden rounded-[18px] border border-[hsl(var(--tile-border))] bg-foreground/[0.04] shadow-sm';
const LABEL = 'line-clamp-2 w-full break-words text-[11px] font-medium leading-tight text-foreground';

/** Right-click and long-press both open the menu; a hover-only "⋯" makes it discoverable with a mouse. */
function useContextMenu() {
    const [open, setOpen] = useState(false);
    const timer = useRef<number | null>(null);
    // A long-press ends in a click; without this the menu opens *and* the link follows.
    const swallowNextClick = useRef(false);

    const clear = () => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    return {
        open,
        setOpen,
        handlers: {
            onContextMenu: (e: React.MouseEvent) => {
                e.preventDefault();
                setOpen(true);
            },
            // Radix opens the menu on pointerdown and on Enter/Space. Both are
            // swallowed in the capture phase so a click follows the link and a
            // tap does too; the menu opens only from right-click, long-press,
            // or the hover "⋯".
            onPointerDownCapture: (e: React.PointerEvent) => {
                e.stopPropagation();
                if (e.pointerType !== 'touch') return;
                clear();
                timer.current = window.setTimeout(() => {
                    swallowNextClick.current = true;
                    setOpen(true);
                }, 500);
            },
            onClickCapture: (e: React.MouseEvent) => {
                if (!swallowNextClick.current) return;
                swallowNextClick.current = false;
                e.preventDefault();
                e.stopPropagation();
            },
            onKeyDownCapture: (e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
            },
            onPointerUp: clear,
            onPointerCancel: clear,
            onPointerMove: clear,
        },
    };
}

function FaviconImage({ bookmark }: { bookmark: Bookmark }) {
    const [failed, setFailed] = useState(false);
    const src = failed ? null : faviconFor(bookmark);
    if (!src) {
        return (
            <span className="text-lg font-bold text-muted-foreground">
                {hostnameOf(bookmark.url).charAt(0).toUpperCase() || '#'}
            </span>
        );
    }
    // Plain <img>: favicons come from arbitrary hosts, which next/image would
    // refuse without a remotePatterns entry per domain.
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-8 w-8 object-contain"
        />
    );
}

function BookmarkTile({
    bookmark,
    folders,
    onRename,
    onMove,
    onDelete,
}: {
    bookmark: Bookmark;
    folders: BookmarkFolder[];
    onRename: () => void;
    onMove: (folderId: string | null) => void;
    onDelete: () => void;
}) {
    const menu = useContextMenu();
    const otherFolders = folders.filter((f) => f.id !== bookmark.folder_id);

    return (
        <DropdownMenu open={menu.open} onOpenChange={menu.setOpen}>
            <DropdownMenuTrigger asChild>
                <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={bookmark.url}
                    className={TILE}
                    {...menu.handlers}
                >
                    <span className={ICON_BOX}>
                        <FaviconImage bookmark={bookmark} />
                    </span>
                    <span className={LABEL}>{bookmark.title}</span>
                    <span
                        role="button"
                        aria-label={`Actions for ${bookmark.title}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            menu.setOpen(true);
                        }}
                        className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur group-hover/tile:flex"
                    >
                        <MoreHorizontal size={14} />
                    </span>
                </a>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem asChild>
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} className="mr-2" /> Open
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onRename}>
                        <Pencil size={14} className="mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <FolderInput size={14} className="mr-2" /> Move to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuPortal>
                            <DropdownMenuSubContent className="w-44">
                                {bookmark.folder_id && (
                                    <DropdownMenuItem onSelect={() => onMove(null)}>
                                        Top level
                                    </DropdownMenuItem>
                                )}
                                {otherFolders.map((f) => (
                                    <DropdownMenuItem key={f.id} onSelect={() => onMove(f.id)}>
                                        <FolderIcon size={14} className="mr-2" /> {f.name}
                                    </DropdownMenuItem>
                                ))}
                                {otherFolders.length === 0 && !bookmark.folder_id && (
                                    <DropdownMenuItem disabled>No folders yet</DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 size={14} className="mr-2" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

function FolderTile({
    folder,
    preview,
    count,
    onOpen,
    onRename,
    onDelete,
}: {
    folder: BookmarkFolder;
    preview: Bookmark[];
    count: number;
    onOpen: () => void;
    onRename: () => void;
    onDelete: () => void;
}) {
    const menu = useContextMenu();

    return (
        <DropdownMenu open={menu.open} onOpenChange={menu.setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={TILE}
                    {...menu.handlers}
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                    }}
                    aria-label={`${folder.name}, ${count} bookmark${count === 1 ? '' : 's'}`}
                >
                    <span className={`${ICON_BOX} grid grid-cols-2 gap-1 p-2`}>
                        {preview.slice(0, 4).map((b) => (
                            <span
                                key={b.id}
                                className="flex items-center justify-center overflow-hidden rounded-md bg-foreground/[0.06]"
                            >
                                <span className="scale-[0.55]">
                                    <FaviconImage bookmark={b} />
                                </span>
                            </span>
                        ))}
                        {preview.length === 0 && (
                            <FolderIcon size={22} className="col-span-2 row-span-2 place-self-center text-muted-foreground" />
                        )}
                    </span>
                    <span className={LABEL}>{folder.name}</span>
                    <span
                        role="button"
                        aria-label={`Actions for folder ${folder.name}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            menu.setOpen(true);
                        }}
                        className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm backdrop-blur group-hover/tile:flex"
                    >
                        <MoreHorizontal size={14} />
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="start" className="w-44">
                    <DropdownMenuItem onSelect={onOpen}>
                        <FolderIcon size={14} className="mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onRename}>
                        <Pencil size={14} className="mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 size={14} className="mr-2" /> Delete folder
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

/* ------------------------------------------------------------------ *
 * The drawer
 * ------------------------------------------------------------------ */

export default function BookmarkDrawer({ userId }: { userId: string | null }) {
    const supabase = useMemo(() => createClient(), []);
    const toast = useToast();

    const [open, setOpen] = useState(false);
    const [folderId, setFolderId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    const { folders, bookmarks, status, error, reload } = useBookmarks(supabase, userId, open);

    const sheetRef = useRef<HTMLElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const returnFocusTo = useRef<HTMLElement | null>(null);

    const close = useCallback(() => setOpen(false), []);

    // ⌘B toggles; the rail item and anything else dispatch `open-bookmarks`.
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'b' && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                setOpen((v) => !v);
                return;
            }
            if (e.key === 'Escape' && open && !prompt) {
                setOpen(false);
            }
        }
        function onOpenRequest() {
            setOpen(true);
        }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('open-bookmarks', onOpenRequest);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('open-bookmarks', onOpenRequest);
        };
    }, [open, prompt]);

    // Focus in on open, back where it came from on close.
    useEffect(() => {
        if (open) {
            returnFocusTo.current = document.activeElement as HTMLElement | null;
            const id = window.setTimeout(() => searchRef.current?.focus(), 50);
            return () => window.clearTimeout(id);
        }
        setQuery('');
        setFolderId(null);
        returnFocusTo.current?.focus?.();
    }, [open]);

    const currentFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;

    // A folder deleted elsewhere while we're inside it.
    useEffect(() => {
        if (folderId && status === 'ready' && !currentFolder) setFolderId(null);
    }, [folderId, currentFolder, status]);

    const term = query.trim().toLowerCase();
    const visibleBookmarks = useMemo(() => {
        if (term) {
            return bookmarks.filter(
                (b) => b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term),
            );
        }
        return bookmarks.filter((b) => b.folder_id === folderId);
    }, [bookmarks, folderId, term]);
    const visibleFolders = term || folderId ? [] : folders;

    function report(err: string | null, okMessage?: string) {
        if (err) {
            toast.error(err);
            return false;
        }
        if (okMessage) toast.success(okMessage);
        return true;
    }

    async function handlePrompt(p: Prompt, v: { primary: string; secondary: string }): Promise<string | null> {
        if (!userId) return 'You need to be signed in.';
        switch (p.kind) {
            case 'add-bookmark': {
                const url = v.primary.trim();
                if (!isBookmarkableUrl(url)) return 'Enter a full http:// or https:// address.';
                const title = v.secondary.trim() || hostnameOf(url);
                const r = await createBookmark(supabase, { user_id: userId, title, url, folder_id: folderId });
                if (r.error === DUPLICATE_URL) return 'Already saved.';
                return r.error;
            }
            case 'add-folder': {
                if (!v.primary.trim()) return 'Give the folder a name.';
                return (await createFolder(supabase, { user_id: userId, name: v.primary })).error;
            }
            case 'rename-bookmark':
                if (!v.primary.trim()) return 'A title is required.';
                return (await renameBookmark(supabase, p.bookmark.id, v.primary)).error;
            case 'rename-folder':
                if (!v.primary.trim()) return 'A name is required.';
                return (await renameFolder(supabase, p.folder.id, v.primary)).error;
        }
    }

    const heading = term
        ? `Results for “${query.trim()}”`
        : currentFolder
          ? currentFolder.name
          : 'Bookmarks';

    return (
        <>
            {/* Click-outside target. Transparent on desktop so the note behind
                stays visible; the sheet itself carries the surface. */}
            {open && (
                <button
                    type="button"
                    aria-label="Close bookmarks"
                    onClick={close}
                    className="fixed inset-0 z-[45] cursor-default bg-black/40 lg:bg-transparent"
                />
            )}

            <aside
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label="Bookmarks"
                aria-hidden={!open}
                inert={!open}
                className={`
                    panel fixed top-0 z-[46] flex h-[100dvh] flex-col overflow-hidden rounded-none border-y-0 border-l-0
                    inset-x-0 lg:inset-x-auto lg:left-[70px] lg:w-[380px]
                    transition-transform duration-300 ease-out
                    ${open ? 'translate-x-0' : '-translate-x-full lg:-translate-x-[calc(100%+70px)]'}
                `}
            >
                {/* Header */}
                <div className="flex flex-shrink-0 items-center gap-2 border-b border-[hsl(var(--sidebar-border))] px-3 py-3">
                    {currentFolder || term ? (
                        <button
                            type="button"
                            onClick={() => (term ? setQuery('') : setFolderId(null))}
                            aria-label="Back"
                            className="pressable flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                        >
                            <ArrowLeft size={18} />
                        </button>
                    ) : (
                        <span className="flex h-9 w-9 items-center justify-center text-primary-text">
                            <BookmarkIcon size={18} />
                        </span>
                    )}
                    <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground">
                        {heading}
                    </h2>
                    <button
                        type="button"
                        onClick={() => setPrompt({ kind: 'add-bookmark' })}
                        aria-label="Add bookmark"
                        title="Add bookmark"
                        className="pressable flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    >
                        <Plus size={18} />
                    </button>
                    {!currentFolder && (
                        <button
                            type="button"
                            onClick={() => setPrompt({ kind: 'add-folder' })}
                            aria-label="New folder"
                            title="New folder"
                            className="pressable flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                        >
                            <FolderPlus size={18} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={close}
                        aria-label="Close"
                        className="pressable flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Search */}
                <div className="flex-shrink-0 px-3 pt-3">
                    <div className="relative">
                        <Search
                            size={15}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search bookmarks"
                            aria-label="Search bookmarks"
                            className="pl-9"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
                    {status === 'loading' && (
                        <div className="grid grid-cols-4 gap-1">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 p-2">
                                    <div className="h-14 w-14 animate-pulse rounded-[18px] bg-foreground/[0.06]" />
                                    <div className="h-2.5 w-12 animate-pulse rounded bg-foreground/[0.06]" />
                                </div>
                            ))}
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                            <p className="text-sm text-muted-foreground">{error ?? 'Could not load bookmarks.'}</p>
                            <Button variant="outline" size="sm" onClick={reload}>
                                Try again
                            </Button>
                        </div>
                    )}

                    {status === 'ready' && visibleFolders.length === 0 && visibleBookmarks.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                            <BookmarkIcon size={28} className="text-muted-foreground/60" />
                            <p className="text-sm font-medium text-foreground">
                                {term ? 'Nothing matches' : currentFolder ? 'This folder is empty' : 'No bookmarks yet'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {term
                                    ? 'Try a different word, or part of the address.'
                                    : 'Use + above, or click the extension on any page.'}
                            </p>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="grid grid-cols-4 gap-1">
                            {visibleFolders.map((f) => {
                                const inside = bookmarks.filter((b) => b.folder_id === f.id);
                                return (
                                    <FolderTile
                                        key={f.id}
                                        folder={f}
                                        preview={inside}
                                        count={inside.length}
                                        onOpen={() => {
                                            setQuery('');
                                            setFolderId(f.id);
                                        }}
                                        onRename={() => setPrompt({ kind: 'rename-folder', folder: f })}
                                        onDelete={async () => {
                                            const r = await deleteFolder(supabase, f.id);
                                            report(r.error, `Deleted “${f.name}” — its bookmarks moved to the top level`);
                                        }}
                                    />
                                );
                            })}
                            {visibleBookmarks.map((b) => (
                                <BookmarkTile
                                    key={b.id}
                                    bookmark={b}
                                    folders={folders}
                                    onRename={() => setPrompt({ kind: 'rename-bookmark', bookmark: b })}
                                    onMove={async (target) => {
                                        const r = await moveBookmark(supabase, b.id, target);
                                        report(r.error);
                                    }}
                                    onDelete={async () => {
                                        const r = await deleteBookmark(supabase, b.id);
                                        report(r.error, 'Bookmark deleted');
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-shrink-0 border-t border-[hsl(var(--sidebar-border))] px-4 py-2 text-[11px] text-muted-foreground">
                    Right-click or long-press a tile for actions ·{' '}
                    <kbd className="rounded border border-[hsl(var(--tile-border))] bg-foreground/5 px-1 py-px">⌘B</kbd>{' '}
                    toggles
                </div>
            </aside>

            <PromptDialog prompt={prompt} onClose={() => setPrompt(null)} onSubmit={handlePrompt} />
        </>
    );
}
