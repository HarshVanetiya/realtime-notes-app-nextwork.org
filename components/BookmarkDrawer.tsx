'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from 'react';
import { usePathname } from 'next/navigation';
import {
    ArrowLeft,
    Bookmark as BookmarkIcon,
    BookmarkPlus,
    ChevronUp,
    Copy,
    ExternalLink,
    FileText,
    Folder as FolderIcon,
    FolderInput,
    FolderPlus,
    MoreHorizontal,
    Pencil,
    Pin,
    PinOff,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/toast-provider';
import { useBookmarks } from '@/lib/use-bookmarks';
import { usePinnedBookmarks } from '@/lib/pinned-bookmarks';
import CreateNoteModal from '@/components/CreateNoteModal';
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
 * Tiles & Components
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
            <span className="text-base font-bold text-muted-foreground">
                {hostnameOf(bookmark.url).charAt(0).toUpperCase() || '#'}
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt=""
            width={32}
            height={32}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-7 w-7 object-contain"
        />
    );
}

function PinnedBookmarkItem({
    bookmark,
    onUnpin,
}: {
    bookmark: Bookmark;
    onUnpin: () => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const toast = useToast();

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(bookmark.url);
            toast.success('Link copied to clipboard');
        } catch {
            toast.error('Failed to copy link');
        }
    };

    return (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    title={`${bookmark.title} · ${hostnameOf(bookmark.url)}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic('light');
                        window.open(bookmark.url, '_blank', 'noopener,noreferrer');
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(true);
                    }}
                    className="group/pin relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/40 bg-foreground/[0.04] hover:bg-foreground/[0.09] hover:border-primary/50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                    <span className="scale-[0.85] flex items-center justify-center pointer-events-none">
                        <FaviconImage bookmark={bookmark} />
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent side="top" align="center" sideOffset={10} className="w-48">
                    <DropdownMenuItem
                        onSelect={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
                    >
                        <ExternalLink size={14} className="mr-2" /> Open link
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleCopyUrl}>
                        <Copy size={14} className="mr-2" /> Copy link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onUnpin}>
                        <PinOff size={14} className="mr-2 text-destructive" /> Unpin from taskbar
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

function BookmarkTile({
    bookmark,
    folders,
    isPinned,
    onTogglePin,
    onRename,
    onMove,
    onDelete,
}: {
    bookmark: Bookmark;
    folders: BookmarkFolder[];
    isPinned: boolean;
    onTogglePin: () => void;
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
                    <span className={`${ICON_BOX} relative`}>
                        <FaviconImage bookmark={bookmark} />
                        {isPinned && (
                            <span
                                title="Pinned to taskbar"
                                className="absolute left-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary-text"
                            >
                                <Pin size={9} className="fill-current rotate-45" />
                            </span>
                        )}
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
                <DropdownMenuContent align="start" className="w-52">
                    <DropdownMenuItem asChild>
                        <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink size={14} className="mr-2" /> Open
                        </a>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onTogglePin}>
                        {isPinned ? (
                            <>
                                <PinOff size={14} className="mr-2" /> Unpin from taskbar
                            </>
                        ) : (
                            <>
                                <Pin size={14} className="mr-2" /> Pin to taskbar
                            </>
                        )}
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
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuPortal>
                <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onSelect={onOpen}>
                        <FolderIcon size={14} className="mr-2" /> Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onRename}>
                        <Pencil size={14} className="mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
                        <Trash2 size={14} className="mr-2" /> Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenuPortal>
        </DropdownMenu>
    );
}

/* ------------------------------------------------------------------ *
 * Samsung Now Bar & Unified Bookmark Drawer
 * ------------------------------------------------------------------ */

export default function BookmarkDrawer({ userId }: { userId: string | null }) {
    const supabase = useMemo(() => createClient(), []);
    const toast = useToast();
    const pathname = usePathname();
    const isDashboard = pathname === '/notes';

    const [open, setOpen] = useState(false);
    const [createMenuOpen, setCreateMenuOpen] = useState(false);
    const [isCreateNoteOpen, setIsCreateNoteOpen] = useState(false);
    const [folderId, setFolderId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [prompt, setPrompt] = useState<Prompt | null>(null);

    // Keep bookmarks loaded so the taskbar has access to pinned bookmarks even when collapsed
    const { folders, bookmarks, status, error, reload } = useBookmarks(supabase, userId, Boolean(userId));
    const { pinnedBookmarks, isPinned, togglePin, unpin } = usePinnedBookmarks(bookmarks);

    const sheetRef = useRef<HTMLElement | null>(null);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const returnFocusTo = useRef<HTMLElement | null>(null);

    const close = useCallback(() => {
        setOpen(false);
    }, []);

    // ⌘B toggles; sidebar item and others dispatch `open-bookmarks` or `open-add-bookmark`.
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
        function onAddBookmarkRequest() {
            setPrompt({ kind: 'add-bookmark' });
        }
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('open-bookmarks', onOpenRequest);
        document.addEventListener('open-add-bookmark', onAddBookmarkRequest);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('open-bookmarks', onOpenRequest);
            document.removeEventListener('open-add-bookmark', onAddBookmarkRequest);
        };
    }, [open, prompt]);

    // Focus into search on drawer open
    useEffect(() => {
        if (open) {
            returnFocusTo.current = document.activeElement as HTMLElement | null;
            const id = window.setTimeout(() => searchRef.current?.focus(), 80);
            return () => window.clearTimeout(id);
        }
        setQuery('');
        setFolderId(null);
        returnFocusTo.current?.focus?.();
    }, [open]);

    const currentFolder = folderId ? folders.find((f) => f.id === folderId) ?? null : null;

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

    // Touch swipe down gesture to dismiss panel on mobile when open
    const [dragY, setDragY] = useState(0);
    const dragStartY = useRef<number | null>(null);

    const onDrawerTouchStart = (e: React.TouchEvent) => {
        if (!open) return;
        dragStartY.current = e.touches[0].clientY;
    };

    const onDrawerTouchMove = (e: React.TouchEvent) => {
        if (!open || dragStartY.current === null) return;
        const dy = e.touches[0].clientY - dragStartY.current;
        if (dy > 0) {
            setDragY(dy);
        }
    };

    const onDrawerTouchEnd = () => {
        if (dragY > 60) {
            triggerHaptic('light');
            close();
        }
        setDragY(0);
        dragStartY.current = null;
    };

    // If we are not on the dashboard and not open, don't show the bottom taskbar
    const shouldRender = isDashboard || open;

    return (
        <>
            {/* Click-outside backdrop scrim when expanded */}
            {open && (
                <div
                    role="button"
                    tabIndex={-1}
                    aria-label="Close bookmarks"
                    onClick={close}
                    className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
                />
            )}

            {/* Bottom Floating Navigation Dock */}
            {shouldRender && (
                <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
                    <div
                        className={`pointer-events-auto flex items-end justify-center transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            open ? 'w-full max-w-full' : 'gap-3 max-w-full'
                        }`}
                    >
                        {/* The Morphing Bar (Samsung Now Bar -> Bookmark Drawer) */}
                        <aside
                            ref={sheetRef}
                            role={open ? 'dialog' : 'toolbar'}
                            aria-modal={open ? 'true' : undefined}
                            aria-label={open ? 'Bookmarks Drawer' : 'Pinned Bookmarks Taskbar'}
                            onTouchStart={open ? onDrawerTouchStart : undefined}
                            onTouchMove={open ? onDrawerTouchMove : undefined}
                            onTouchEnd={open ? onDrawerTouchEnd : undefined}
                            style={{
                                transform:
                                    open && dragY > 0
                                        ? `translateY(${dragY}px)`
                                        : undefined,
                                transition:
                                    'width 500ms cubic-bezier(0.16, 1, 0.3, 1), height 500ms cubic-bezier(0.16, 1, 0.3, 1), border-radius 420ms cubic-bezier(0.16, 1, 0.3, 1), transform 450ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 500ms ease, background-color 350ms ease',
                            }}
                            className={`
                                relative flex flex-col overflow-hidden will-change-[width,height,border-radius]
                                ${
                                    open
                                        ? 'w-[calc(100%-1rem)] sm:max-w-[min(72vw,860px)] h-[min(80dvh,640px)] rounded-3xl bg-popover/92 dark:bg-[#131418]/95 backdrop-blur-2xl border border-[hsl(var(--tile-border))] shadow-2xl shadow-black/40'
                                        : 'h-14 w-auto min-w-[200px] max-w-[calc(100vw-6rem)] sm:max-w-[480px] rounded-full bg-card/85 dark:bg-[#131418]/85 backdrop-blur-2xl border border-[hsl(var(--tile-border)/0.9)] shadow-xl shadow-black/15 hover:border-primary/40'
                                }
                            `}
                        >
                            {/* COLLAPSED STATE: Taskbar with Pinned Bookmarks */}
                            <div
                                className={`flex h-full w-full items-center justify-between px-3 gap-2 transition-all duration-200 ${
                                    open
                                        ? 'opacity-0 pointer-events-none absolute inset-0 -translate-y-4 scale-95'
                                        : 'opacity-100'
                                }`}
                            >
                                {/* Bookmark Icon / Expand Trigger */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setOpen(true);
                                    }}
                                    title="All Bookmarks (⌘B)"
                                    aria-label="Open Bookmarks Drawer"
                                    className="pressable flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary-text hover:bg-primary/20 hover:scale-105 active:scale-95 transition-all shadow-xs"
                                >
                                    <BookmarkIcon size={18} />
                                </button>

                                <div className="h-5 w-px bg-border/60 flex-shrink-0" />

                                {/* Pinned Bookmarks row */}
                                <div className="flex flex-1 items-center gap-1.5 overflow-x-auto scrollbar-none py-1 px-0.5 min-w-0">
                                    {pinnedBookmarks.map((b) => (
                                        <PinnedBookmarkItem
                                            key={b.id}
                                            bookmark={b}
                                            onUnpin={() => unpin(b.id)}
                                        />
                                    ))}

                                    {pinnedBookmarks.length === 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                triggerHaptic('light');
                                                setPrompt({ kind: 'add-bookmark' });
                                            }}
                                            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors whitespace-nowrap"
                                        >
                                            <Plus size={14} />
                                            <span>Add bookmark</span>
                                        </button>
                                    )}
                                </div>

                                {/* Expand chevron button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        triggerHaptic('light');
                                        setOpen(true);
                                    }}
                                    title="Expand Bookmarks Drawer (⌘B)"
                                    aria-label="Expand Bookmarks Drawer"
                                    className="pressable flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-all"
                                >
                                    <ChevronUp size={16} />
                                </button>
                            </div>

                            {/* EXPANDED STATE: Full Bookmarks Drawer Content */}
                            <div
                                className={`flex flex-col flex-1 h-full min-h-0 transition-all duration-300 delay-75 ${
                                    !open
                                        ? 'opacity-0 pointer-events-none absolute inset-0 translate-y-6 scale-95'
                                        : 'opacity-100'
                                }`}
                            >
                                {/* Mobile pull down handle */}
                                <div className="flex w-full cursor-grab justify-center pt-2.5 pb-0.5 sm:hidden">
                                    <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30 transition-colors hover:bg-muted-foreground/50" />
                                </div>

                                {/* Drawer Header */}
                                <div className="flex flex-shrink-0 items-center gap-2 border-b border-[hsl(var(--tile-border)/0.5)] px-4 py-3">
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

                                {/* Drawer Search */}
                                <div className="flex-shrink-0 px-4 pt-3">
                                    <div className="relative">
                                        <Search
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                        />
                                        <Input
                                            ref={searchRef}
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="Search bookmarks..."
                                            aria-label="Search bookmarks"
                                            className="pl-9"
                                        />
                                    </div>
                                </div>

                                {/* Grid of Folders & Bookmarks */}
                                <div className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
                                    {status === 'loading' && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
                                            {Array.from({ length: 12 }).map((_, i) => (
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
                                                    : 'Use + above to save a link, or click the extension.'}
                                            </p>
                                        </div>
                                    )}

                                    {status === 'ready' && (
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1">
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
                                                            report(r.error, `Deleted "${f.name}" — bookmarks moved to top level`);
                                                        }}
                                                    />
                                                );
                                            })}
                                            {visibleBookmarks.map((b) => (
                                                <BookmarkTile
                                                    key={b.id}
                                                    bookmark={b}
                                                    folders={folders}
                                                    isPinned={isPinned(b.id)}
                                                    onTogglePin={() => {
                                                        triggerHaptic('light');
                                                        togglePin(b.id);
                                                        toast.success(isPinned(b.id) ? 'Unpinned from taskbar' : 'Pinned to taskbar');
                                                    }}
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

                                <div className="flex-shrink-0 border-t border-[hsl(var(--tile-border)/0.5)] px-4 py-2 text-[11px] text-muted-foreground">
                                    Right-click or long-press tile for pin & actions ·{' '}
                                    <kbd className="rounded border border-[hsl(var(--tile-border))] bg-foreground/5 px-1 py-px">⌘B</kbd>{' '}
                                    toggles
                                </div>
                            </div>
                        </aside>

                        {/* Dual-Action Plus Button Island */}
                        <div
                            style={{
                                transition:
                                    'transform 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease',
                            }}
                            className={`flex-shrink-0 ${
                                open
                                    ? 'scale-0 opacity-0 pointer-events-none w-0 -mr-3'
                                    : 'scale-100 opacity-100'
                            }`}
                        >
                            <DropdownMenu open={createMenuOpen} onOpenChange={setCreateMenuOpen}>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={() => triggerHaptic('light')}
                                        aria-label="Create note or bookmark"
                                        className="btn-accent group relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full shadow-lg transition-transform active:scale-95"
                                    >
                                        <Plus
                                            size={26}
                                            className={`relative z-10 stroke-[2.5] transition-transform duration-300 ease-in-out ${
                                                createMenuOpen ? 'rotate-45' : 'group-hover:rotate-90'
                                            }`}
                                        />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuContent
                                        side="top"
                                        align="end"
                                        sideOffset={14}
                                        className="w-56 p-1.5 rounded-2xl border border-[hsl(var(--tile-border))] bg-popover/95 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 data-[side=top]:slide-in-from-bottom-2"
                                    >
                                        <DropdownMenuItem
                                            onSelect={() => {
                                                triggerHaptic('light');
                                                setIsCreateNoteOpen(true);
                                            }}
                                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors focus:bg-primary/10 focus:text-primary-text"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-text flex-shrink-0">
                                                <FileText size={16} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                                <span className="font-semibold text-foreground">New Note</span>
                                                <span className="text-[11px] text-muted-foreground">Capture thoughts</span>
                                            </div>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            onSelect={() => {
                                                triggerHaptic('light');
                                                setPrompt({ kind: 'add-bookmark' });
                                            }}
                                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors focus:bg-primary/10 focus:text-primary-text"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary-text flex-shrink-0">
                                                <BookmarkPlus size={16} />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0 text-left">
                                                <span className="font-semibold text-foreground">New Bookmark</span>
                                                <span className="text-[11px] text-muted-foreground">Save link & title</span>
                                            </div>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenuPortal>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            )}

            {/* Controlled Create Note Modal */}
            <CreateNoteModal open={isCreateNoteOpen} onOpenChange={setIsCreateNoteOpen} />

            {/* Prompt Dialog for Add Bookmark, Add Folder, and Renames */}
            <PromptDialog prompt={prompt} onClose={() => setPrompt(null)} onSubmit={handlePrompt} />
        </>
    );
}
