'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    BookOpen,
    FilePlus,
    Star,
    LogOut,
    Menu,
    X,
    NotebookPen,
} from 'lucide-react';

const navItems = [
    { href: '/notes', label: 'My Notes', icon: BookOpen, exact: true },
    {
        href: '/notes/create',
        label: 'Create Note',
        icon: FilePlus,
        exact: false,
    },
    // {
    //     href: '/notes?filter=favorites',
    //     label: 'Favorites',
    //     icon: Star,
    //     exact: false,
    //     isFavorites: true,
    // },
];

export default function AppSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    useEffect(() => {
        async function getUser() {
            const supabase = createClient();
            const { data } = await supabase.auth.getClaims();
            setUserEmail(data?.claims?.email ?? null);
        }
        getUser();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/auth/login');
    };

    const isActive = (href: string, exact: boolean, isFavorites?: boolean) => {
        if (isFavorites) return false; // favorites handled separately
        if (exact) return pathname === href;
        return pathname.startsWith(href);
    };

    const initials = userEmail ? userEmail.charAt(0).toUpperCase() : '?';

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-6 border-b border-border/50">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-glow-sm flex-shrink-0">
                    <NotebookPen size={18} className="text-white" />
                </div>
                <div>
                    <h1 className="font-bold text-sm text-foreground tracking-tight">
                        Realtime Notes
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Your personal workspace
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-3">
                    Workspace
                </p>
                {navItems.map((item) => {
                    const active = isActive(
                        item.href,
                        item.exact ?? false,
                        // item.isFavorites,
                    );
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200 relative
                ${
                    active
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                }
              `}
                        >
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                            )}
                            <Icon
                                size={17}
                                className={`flex-shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                            />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div className="px-3 py-4 border-t border-border/50">
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                            {userEmail ?? 'Loading...'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Signed in
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        title="Sign out"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    >
                        <LogOut size={15} />
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border shadow-card text-foreground"
            >
                {isOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <aside
                className={`
          lg:hidden fixed left-0 top-0 z-40 h-full w-64 bg-sidebar border-r border-border
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <SidebarContent />
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-sidebar border-r border-border flex-shrink-0 animate-fade-in-left">
                <SidebarContent />
            </aside>
        </>
    );
}
