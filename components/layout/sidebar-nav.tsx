'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
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

        return (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'block rounded-xl border border-transparent px-3 py-2 transition hover:border-camp-forest/20 hover:bg-white',
              isActive && 'border-camp-forest/15 bg-white'
            )}
          >
            <span className="block font-semibold text-camp-forest">{item.label}</span>
            <span className="block text-xs text-slate-600">{item.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}
