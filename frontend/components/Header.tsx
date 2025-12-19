'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  History,
  Settings,
  Bot,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WalletButton } from '@/components/WalletButton';
import { cn } from '@/lib/utils';
import { getApiModeLabel, useFeatureFlags } from '@/lib/feature-flags';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const flags = useFeatureFlags();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Portfolio', href: '/portfolio', icon: Wallet },
    { name: 'History', href: '/history', icon: History },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-solana to-solana-light flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">
            Meme Trading Bot
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2',
                    isActive && 'bg-secondary'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* API Mode Badge */}
          <Badge
            variant={flags.USE_REAL_API ? 'default' : 'secondary'}
            className="gap-1 hidden sm:flex"
          >
            <Zap className="h-3 w-3" />
            {getApiModeLabel()}
          </Badge>

          {/* Wallet Connection */}
          <WalletButton className="hidden sm:flex" />

          {/* Theme Toggle */}
          <ThemeToggle className="h-9 w-9" />

          {/* Settings */}
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Built for Solana Grant Application • AI-Powered Trading
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Paper Trading Mode (Real API)</span>
          <Separator orientation="vertical" className="h-4" />
          <a
            href="https://solana.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Powered by Solana
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Header;
