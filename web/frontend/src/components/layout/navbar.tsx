'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Rocket,
  LayoutGrid,
  Briefcase,
  Settings,
  User,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/templates', label: 'Templates', icon: LayoutGrid },
  { href: '/setup', label: 'Setup', icon: Settings },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, login, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Rocket className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">TrainForge</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center space-x-1 text-sm font-medium transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user.avatar_url}
                      alt={user.github_username}
                    />
                    <AvatarFallback>
                      {user.github_username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline-block">
                    {user.github_username}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{user.github_username}</p>
                  <p className="text-muted-foreground text-xs">
                    {user.installations?.length || 0} installation(s)
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/setup">
                    <Settings className="mr-2 h-4 w-4" />
                    Setup
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 cursor-pointer"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={login}>Sign in with GitHub</Button>
          )}
        </div>
      </div>
    </header>
  );
}
