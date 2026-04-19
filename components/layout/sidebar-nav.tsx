'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import type { NavItem } from '@/lib/app-config';
import { cn } from '@/lib/utils';

const SIDEBAR_SCROLL_KEY = 'camp-sidebar-nav-scroll';

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  // Clear pending state when pathname changes (navigation completed)
  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) {
      return;
    }

    const savedScrollTop = window.sessionStorage.getItem(SIDEBAR_SCROLL_KEY);

    if (savedScrollTop) {
      nav.scrollTop = Number(savedScrollTop);
    }
  }, [pathname]);

  return (
    <nav
      ref={navRef}
      onScroll={(event) => {
        window.sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(event.currentTarget.scrollTop));
      }}
      className="space-y-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1"
    >
      {items.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        const isPending = pendingHref === item.href && !isActive;
        const isHighlighted = isActive || isPending;

        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            onClick={() => {
              if (!isActive) {
                setPendingHref(item.href);
              }
            }}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'block rounded-xl border border-transparent px-3 py-2.5 transition-all hover:border-camp-forest/15 hover:bg-camp-sand/40',
              isHighlighted && 'border-camp-forest/10 bg-white shadow-sm'
            )}
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-camp-forest">
              {item.label}
              {isPending && (
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-camp-ember/60" />
              )}
            </span>
            <span className="block text-xs text-camp-moss">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
