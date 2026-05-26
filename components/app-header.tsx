'use client';

import { ThemeSwitcher } from '@/components/theme-switcher';
import { Search } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function AppHeader({ title, subtitle, action }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/60">
      {/* Left spacer for mobile hamburger */}
      <div className="w-8 lg:hidden flex-shrink-0" />

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      {/* Search bar */}
      <div className="hidden md:flex items-center gap-2 bg-muted/60 border border-border/60 rounded-xl px-3 py-2 w-56 lg:w-72 transition-all focus-within:border-primary/50 focus-within:bg-muted/80">
        <Search size={14} className="text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search notes..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none flex-1 min-w-0"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {action}
        <ThemeSwitcher />
      </div>
    </header>
  );
}
