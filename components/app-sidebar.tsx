'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import {
    BookOpen,
    FilePlus,
    Search,
    Star,
    SquareKanban,
    Trash2,
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
} from 'lucide-react';

import Image from 'next/image';
import CreateNoteModal from './CreateNoteModal';
import { useToast } from '@/components/toast-provider';
import notesIcon from '../public/notes-icon.svg';

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
    const { resolvedTheme, setTheme } = useTheme();
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

    // While the drawer is open: lock the page behind it and allow Escape out.
    useEffect(() => {
        if (!isOpen) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
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
                        {active && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                        )}
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

                const itemClassName = `
                    group flex items-center rounded-xl text-sm font-medium
                    transition-all duration-200 relative w-full text-left
                    ${
                        active
                            ? ' text-primary-text shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                    }
                    ${collapsed ? 'gap-0 px-2 py-3 justify-center' : 'gap-3 px-3 py-3'}
                `;

                if (item.action === 'search') {
                    return (
                        <button
                            key={item.label}
                            className={itemClassName}
                            onClick={() => {
                                setIsOpen(false);
                                document.dispatchEvent(
                                    new CustomEvent('open-command-palette'),
                                );
                            }}
                        >
                            {itemContent}
                            {!collapsed && (
                                <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
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
                            className={itemClassName}
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
                            className={itemClassName}
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
                        className={itemClassName}
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
            <div className="flex items-center gap-2.5 px-4 py-6 border-b border-border/50 flex-shrink-0 bg-foreground/5 dark:bg-white/10">
                {options?.onToggle ? (
                    <button
                        onClick={options.onToggle}
                        aria-label={
                            collapsed ? 'Expand sidebar' : 'Collapse sidebar'
                        }
                        aria-expanded={!collapsed}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent transition-transform hover:scale-105"
                    >
                        <Image
                            src={notesIcon}
                            alt="Slate Logo"
                            className="w-full h-full object-contain"
                        />
                    </button>
                ) : (
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                        <Image
                            src={notesIcon}
                            alt="Slate Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}
                <div
                    className={`transition-all duration-300 flex flex-col justify-center min-w-0 flex-1 ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                >
                    <h1 className="font-black text-2xl text-foreground tracking-tighter truncate lowercase flex items-baseline">
                        slate<span className="text-primary-text font-black">.</span>
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
                className={`py-4 border-t border-border/50 flex-shrink-0 overflow-visible transition-all duration-300 relative ${collapsed ? 'px-[19px]' : 'px-4'}`}
            >
                <button
                    onClick={() =>
                        !collapsed && setIsProfileOpen(!isProfileOpen)
                    }
                    aria-label="Profile menu"
                    aria-expanded={isProfileOpen}
                    className={`flex w-full items-center rounded-xl hover:bg-foreground/5 transition-colors group ${collapsed ? 'gap-0 p-0 cursor-default' : 'gap-3 px-2 py-2'}`}
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
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-background/90 backdrop-blur-xl border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50">
                        <div className="px-2 py-2 border-b border-border/50 mb-2">
                            <p className="text-xs text-muted-foreground">
                                Logged in as
                            </p>
                            <p className="text-sm font-medium text-foreground truncate">
                                {userEmail ?? 'Loading...'}
                            </p>
                        </div>
                        <button
                            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                            className="flex items-center gap-2 px-2 py-2.5 text-sm text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-left font-medium"
                        >
                            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-2 py-2.5 text-sm text-destructive hover:bg-destructive/10 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition-colors text-left font-medium"
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
                    onClick={() => setIsOpen(true)}
                    aria-label="Open menu"
                    aria-controls="mobile-nav"
                    aria-expanded={false}
                    className="lg:hidden fixed top-3 left-3 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border shadow-card text-foreground"
                >
                    <Menu size={18} />
                </button>
            )}

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            {/* Closed, the drawer is only translated off-screen, so without
                `inert` its links stay in the tab order and keyboard users tab
                into an invisible menu. */}
            <aside
                id="mobile-nav"
                aria-label="Main menu"
                inert={!isOpen}
                className={`
          lg:hidden fixed left-0 top-0 z-40 h-full w-[min(18rem,85vw)] bg-background/95 backdrop-blur-md border-r border-border/50
          transition-transform duration-300 ease-out
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
                        fixed left-0 top-0 h-screen bg-background/80 backdrop-blur-md border border-border/50 border-r flex flex-col
                        transition-all duration-300 ease-in-out z-40 overflow-hidden
                        ${isExpanded ? 'w-64 shadow-lg' : 'w-[70px]'}
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
