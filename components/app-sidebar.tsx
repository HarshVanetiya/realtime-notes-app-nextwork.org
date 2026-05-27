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

import Image from 'next/image';
import notesIcon from '../public/notes-icon.svg';

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
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
    const [isHovered, setIsHovered] = useState(false);

    const SidebarContent = ({ collapsed }: { collapsed?: boolean }) => (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Brand */}
            <div className="flex items-center gap-2.5 px-4 py-6 border-b border-border/50 flex-shrink-0 bg-white/30 ">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-transparent">
                    <Image
                        src={notesIcon}
                        alt="Slate Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
                <div
                    className={`transition-all duration-300 flex flex-col justify-center min-w-0 ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                >
                    <h1 className="font-black text-2xl text-foreground tracking-tighter truncate lowercase flex items-baseline">
                        slate<span className="text-primary font-black">.</span>
                    </h1>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
                <p
                    className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 mb-3 transition-all duration-300 truncate ${collapsed ? 'opacity-0 h-0 mb-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                >
                    Workspace
                </p>
                {navItems.map((item) => {
                    const active = isActive(item.href, item.exact ?? false);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`
                                group flex items-center rounded-xl text-sm font-medium
                                transition-all duration-200 relative
                                ${
                                    active
                                        ? ' text-primary shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }
                                ${collapsed ? 'gap-0 px-2 py-2.5 justify-center' : 'gap-3 px-3 py-2.5'}
                            `}
                        >
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                            )}
                            <Icon
                                size={17}
                                className={`flex-shrink-0 transition-colors ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}
                            />
                            <span
                                className={`transition-all duration-300 truncate ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* User + Logout */}
            <div
                className={`py-4 border-t border-border/50 flex-shrink-0 overflow-visible transition-all duration-300 relative ${collapsed ? 'px-[19px]' : 'px-4'}`}
            >
                <div
                    onClick={() =>
                        !collapsed && setIsProfileOpen(!isProfileOpen)
                    }
                    className={`flex items-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer group ${collapsed ? 'gap-0 p-0 cursor-default' : 'gap-3 px-2 py-2'}`}
                >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0 border border-primary/20">
                        {initials}
                    </div>
                    <div
                        className={`transition-all duration-300 flex-1 min-w-0 flex items-center justify-between ${collapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}
                    >
                        <div className="min-w-0 pr-2">
                            <p className="text-sm font-medium text-foreground truncate">
                                Profile
                            </p>
                            {/* <p className="text-xs text-green-500 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                            </p> */}
                        </div>
                    </div>
                </div>

                {/* Dropdown Menu */}
                {!collapsed && isProfileOpen && (
                    <div className="absolute bottom-full left-4 right-4 mb-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50">
                        <div className="px-2 py-2 border-b border-white/10 mb-5">
                            <p className="text-xs text-muted-foreground">
                                Logged in as
                            </p>
                            <p className="text-sm font-medium text-foreground truncate">
                                {userEmail ?? 'Loading...'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-2 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors text-left font-medium"
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
          lg:hidden fixed left-0 top-0 z-40 h-full w-64 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl border-r
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                <SidebarContent collapsed={false} />
            </aside>

            {/* Desktop sidebar container (reserves space so layout doesn't shift) */}
            <aside
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => {
                    setIsProfileOpen(false);
                    setIsHovered(false);
                }}
                className="hidden lg:block relative h-screen transition-all duration-300 ease-in-out flex-shrink-0 w-[70px]"
            >
                {/* Floating expandable menu */}
                <div
                    className={`
                        fixed left-0 top-0 h-screen bg-white/10 backdrop-blur-md border border-white/20 border-r flex flex-col
                        transition-all duration-300 ease-in-out z-40 overflow-hidden
                        ${isHovered ? 'w-64 shadow-lg' : 'w-[70px]'}
                    `}
                >
                    <SidebarContent collapsed={!isHovered} />
                </div>
            </aside>
        </>
    );
}
