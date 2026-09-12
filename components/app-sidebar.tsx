'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import {
    Bookmark,
    BookOpen,
    FilePlus,
    Search,
    Star,
    SquareKanban,
    Trash2,
    LogOut,
    Menu,
    X,
    SlidersHorizontal,
} from 'lucide-react';

import CreateNoteModal from './CreateNoteModal';
import { useToast } from '@/components/toast-provider';
import PrismMark from '@/components/PrismMark';

const navItems = [
    { href: '/notes', label: 'My Notes', icon: BookOpen, exact: true },
    {
        href: '#',
        action: 'search',
        label: 'Search',
        icon: Search,
        exact: false,
        shortcut: '⌘K',
    },
    {
        href: '#',
        action: 'create-note',
        label: 'Create Note',
        icon: FilePlus,
        exact: false,
    },
    {
        href: '/notes?filter=favorites',
        label: 'Favorites',
        icon: Star,
        exact: false,
        isFavorites: true,
    },
    {
        href: '#',
        action: 'bookmarks',
        label: 'Bookmarks',
        icon: Bookmark,
        exact: false,
        shortcut: '⌘B',
    },
    { href: '/notes/trash', label: 'Trash', icon: Trash2, exact: true },
    {
        href: 'https://todoist-five-brown.vercel.app/',
        label: 'Kanban Board',
        icon: SquareKanban,
        exact: false,
        external: true,
    },
];

export default function AppSidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    // Hover doesn't exist on touch devices. Without a click-to-pin the rail
    // stays collapsed forever on a tablet, and logout / theme become unreachable.
    const [isPinned, setIsPinned] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const isExpanded = isHovered || isPinned;

    useEffect(() => {
        async function getUser() {
            const supabase = createClient();
            const { data } = await supabase.auth.getClaims();
            setUserEmail(data?.claims?.email ?? null);
        }
        getUser();
    }, []);

    // Close the mobile drawer whenever navigation happens.
    useEffect(() => {
        setIsOpen(false);
    }, [pathname, searchParams]);

    const drawerRef = useRef<HTMLElement | null>(null);
    const hamburgerRef = useRef<HTMLButtonElement | null>(null);
    const shouldRestoreFocus = useRef(false);

    // While the drawer is open: lock the page behind it, keep focus inside it,
    // and allow Escape out.
    //
    // `inert` on the closed drawer already keeps its links out of the tab order.
    // The reverse was still missing: with the drawer *open*, Tab walked straight
    // out into the page underneath it, which is invisible behind the overlay —
    // a keyboard user ended up somewhere they could not see, with no way back.
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Captured now: by cleanup time the ref may already point elsewhere.
        const drawer = drawerRef.current;

        const focusable = () =>
            Array.from(
                drawer?.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
                ) ?? [],
            ).filter((el) => el.offsetParent !== null);

        // Focus the drawer itself rather than its first link: announcing the
        // menu's name before its contents is the point of labelling it.
        drawer?.focus({ preventScroll: true });

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
                return;
            }
            if (e.key !== 'Tab') return;

            const items = focusable();
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;

            if (!drawer?.contains(active)) {
                e.preventDefault();
                (e.shiftKey ? last : first).focus();
                return;
            }
            if (e.shiftKey && active === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
            // Only if focus is still inside the drawer — a navigation that
            // closed it has already moved focus somewhere more useful.
            //
            // The hamburger cannot be focused from here: it is unmounted while
            // the drawer is open (it would sit on top of the drawer's own
            // header), so at cleanup time the element to return to does not
            // exist yet. Hence a flag, consumed by the effect below once it is
            // back in the tree — without that, Escape dropped focus to <body>.
            if (drawer?.contains(document.activeElement)) {
                shouldRestoreFocus.current = true;
            }
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen || !shouldRestoreFocus.current) return;
        shouldRestoreFocus.current = false;
        hamburgerRef.current?.focus();
    }, [isOpen]);

    const handleLogout = async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error('Could not sign out', { description: error.message });
            return;
        }
        router.push('/auth/login');
    };

    const isActive = (href: string, exact: boolean, isFavorites?: boolean) => {
        if (isFavorites) {
            return searchParams.get('filter') === 'favorites';
        }
        // If it's the 'My Notes' link, make sure it's not active if we are in favorites view
        if (href === '/notes' && searchParams.get('filter') === 'favorites') {
            return false;
        }
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const initials = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

    const handleCreateNoteClick = () => {
        setIsHovered(false);
        setIsPinned(false);
        setIsProfileOpen(false);
        setIsOpen(false);
        setIsCreateModalOpen(true);
    };

    const renderNavItems = (collapsed?: boolean) => (
        <>
            {navItems.map((item) => {
                const active = item.action ? false : isActive(item.href, item.exact ?? false, item.isFavorites);
                const Icon = item.icon;
                const itemContent = (
                    <>
                        <Icon
                            size={17}
                            className={`flex-shrink-0 transition-colors ${active ? 'text-primary-text' : 'text-muted-foreground group-hover:text-foreground'}`}
                        />
                        <span
                            className={`transition-all duration-300 truncate ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                        >
                            {item.label}
                        </span>
                    </>
                );

                // `rail-item` carries the whole visual state, including the
                // active bar, so the row markup is identical whether the rail
                // is collapsed or expanded — one class, one source of truth.
                const itemClassName = `
                    group rail-item pressable flex items-center rounded-xl text-sm font-medium
                    w-full text-left
                    ${active ? 'text-primary-text' : 'text-muted-foreground hover:text-foreground'}
                    ${collapsed ? 'gap-0 px-2 py-3 justify-center' : 'gap-3 px-3 py-3'}
                `;
                const itemProps = { className: itemClassName, 'data-active': active };

                if (item.action === 'search' || item.action === 'bookmarks') {
                    const eventName =
                        item.action === 'search' ? 'open-command-palette' : 'open-bookmarks';
                    return (
                        <button
                            key={item.label}
                            {...itemProps}
                            onClick={() => {
                                setIsOpen(false);
                                setIsHovered(false);
                                document.dispatchEvent(new CustomEvent(eventName));
                            }}
                        >
                            {itemContent}
                            {!collapsed && (
                                <kbd className="ml-auto rounded border border-[hsl(var(--tile-border))] bg-foreground/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    {item.shortcut}
                                </kbd>
                            )}
                        </button>
                    );
                }

                if (item.action === 'create-note') {
                    return (
                        <button
                            key={item.label}
                            {...itemProps}
                            onClick={handleCreateNoteClick}
                        >
                            {itemContent}
                        </button>
                    );
                }

                if (item.external) {
                    return (
                        <a
                            key={item.label}
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            onClick={() => setIsOpen(false)}
                            {...itemProps}
                        >
                            {itemContent}
                        </a>
                    );
                }

                return (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        {...itemProps}
                    >
                        {itemContent}
                    </Link>
                );
            })}
        </>
    );

    const renderSidebarContent = (
        collapsed?: boolean,
        options?: { onClose?: () => void; onToggle?: () => void },
    ) => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Brand */}
            {/* No wash behind the brand: a tinted strip is exactly the kind of
                gloss the matte base rules out. A hairline is enough. */}
            <div className="flex flex-shrink-0 items-center gap-2.5 border-b border-[hsl(var(--sidebar-border))] px-4 py-6">
                {options?.onToggle ? (
                    <button
                        onClick={options.onToggle}
                        aria-label={
                            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        aria-expanded={!collapsed}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent transition-transform hover:scale-105"
                    >
                        <PrismMark size={30} idSuffix="rail" tone="accent" />
                    </button>
                ) : (
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                        <PrismMark size={30} idSuffix="rail-static" tone="accent" />
                    </div>
                )}
                <div
                    className={`transition-all duration-300 flex flex-col justify-center min-w-0 flex-1 ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                >
                    <h1 className="flex items-baseline truncate text-2xl font-black tracking-tighter text-foreground">
                        Prism
                    </h1>
                </div>
                {options?.onClose && (
                    <button
                        onClick={options.onClose}
                        aria-label="Close menu"
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav
                aria-label="Workspace"
                className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin"
            >
                <p
                    className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-3 transition-all duration-300 truncate ${collapsed ? 'opacity-0 h-0 mb-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                >
                    Workspace
                </p>
                {renderNavItems(collapsed)}
            </nav>

            {/* User + Logout */}
            <div
                className={`relative flex-shrink-0 overflow-visible border-t border-[hsl(var(--sidebar-border))] py-4 transition-all duration-300 ${collapsed ? 'px-[19px]' : 'px-4'}`}
            >
                <button
                    onClick={() =>
                        !collapsed && setIsProfileOpen(!isProfileOpen)
                    }
                    aria-label="Profile menu"
                    aria-expanded={isProfileOpen}
                    className={`group rail-item flex w-full items-center rounded-xl ${collapsed ? 'cursor-default gap-0 p-0' : 'gap-3 px-2 py-2'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-text text-xs font-bold flex-shrink-0 border border-primary/20">
                        {initials}
                    </div>
                    <div
                        className={`transition-all duration-300 flex-1 min-w-0 flex items-center justify-between ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                    >
                        <div className="min-w-0 pr-2 text-left">
                            <p className="text-sm font-medium text-foreground truncate">
                                Profile
                            </p>
                        </div>
                    </div>
                </button>

                {/* Dropdown Menu */}
                {!collapsed && isProfileOpen && (
                    <div className="spatial-panel absolute bottom-full left-4 right-4 z-50 mb-2 flex flex-col gap-1 rounded-xl p-2">
                        <div className="mb-2 border-b border-[hsl(var(--tile-border))] px-2 py-2">
                            <p className="text-xs text-muted-foreground">
                                Logged in as
                            </p>
                            <p className="text-sm font-medium text-foreground truncate">
                                {userEmail ?? 'Loading...'}
                            </p>
                        </div>
                        {/* A settings menu holding exactly one setting was a
                            sign the rest had nowhere to live. Theme is now one
                            row inside Preferences, alongside the accent,
                            layout and tag colours. */}
                        <button
                            onClick={() => {
                                setIsProfileOpen(false);
                                document.dispatchEvent(new CustomEvent('open-preferences'));
                            }}
                            className="rail-item pressable flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-foreground"
                        >
                            <span className="flex items-center gap-2">
                                <SlidersHorizontal size={16} />
                                Preferences
                            </span>
                            <kbd className="rounded border border-[hsl(var(--tile-border))] bg-foreground/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                ⌘,
                            </kbd>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="pressable flex items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                        >
                            <LogOut size={16} />
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger — hidden while the drawer is open, where it
                would otherwise sit on top of the drawer's own brand header. */}
            {!isOpen && (
                <button
                    ref={hamburgerRef}
                    onClick={() => setIsOpen(true)}
                    aria-label="Open menu"
                    aria-controls="mobile-nav"
                    aria-expanded={false}
                    className="panel pressable fixed left-3 top-3 z-50 flex h-11 w-11 items-center justify-center rounded-xl text-foreground lg:hidden"
                >
                    <Menu size={18} />
                </button>
            )}

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    // A plain dim, not a blur. A full-viewport backdrop-filter
                    // is re-read on every composited frame, and the drawer
                    // slides across it — so the blur would be recomputed for
                    // the whole 300ms of the animation, every time.
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            {/* Closed, the drawer is only translated off-screen, so without
                `inert` its links stay in the tab order and keyboard users tab
                into an invisible menu. */}
            <aside
                id="mobile-nav"
                ref={drawerRef}
                aria-label="Main menu"
                aria-modal={isOpen || undefined}
                role={isOpen ? 'dialog' : undefined}
                tabIndex={-1}
                inert={!isOpen}
                className={`
          rail fixed left-0 top-0 z-40 h-full w-[min(18rem,85vw)] border-r
          transition-transform duration-300 ease-out lg:hidden
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                {renderSidebarContent(false, {
                    onClose: () => setIsOpen(false),
                })}
            </aside>

            {/* Desktop sidebar container (reserves space so layout doesn't shift) */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    if (isPinned) return;
                    setIsProfileOpen(false);
                    setIsHovered(false);
                }}
                onFocus={() => setIsHovered(true)}
                className="hidden lg:block relative h-screen transition-all duration-300 ease-in-out flex-shrink-0 w-[70px]"
            >
                {/* Floating expandable menu */}
                <div
                    className={`
                        rail fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r
                        transition-[width] duration-300 ease-in-out
                        ${isExpanded ? 'w-64 shadow-xl' : 'w-[70px]'}
                    `}
                >
                    {renderSidebarContent(!isExpanded, {
                        onToggle: () => {
                            const next = !isPinned;
                            setIsPinned(next);
                            setIsHovered(next);
                            if (!next) setIsProfileOpen(false);
                        },
                    })}
                </div>
            </aside>

            {/* Create Note Modal - rendered at top level, outside sidebar */}
            <CreateNoteModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            />
        </>
    );
}
