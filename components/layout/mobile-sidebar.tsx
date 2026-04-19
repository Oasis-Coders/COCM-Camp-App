'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

export function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const close = useCallback(() => setIsOpen(false), []);

  return (
    <>
      {/* Mobile hamburger — only visible below lg */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed left-4 top-4 z-50 flex h-11 w-11 items-center justify-center rounded-xl bg-camp-forest text-lg text-white shadow-card transition hover:bg-camp-forest-light lg:hidden"
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-camp-forest/40 backdrop-blur-sm transition-opacity lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={close}
        aria-hidden="true"
      />

      {/* Sidebar drawer (mobile) / static aside (desktop) */}
      <aside
        className={cn(
          'border-camp-forest/8 fixed inset-y-0 left-0 z-40 flex w-80 max-w-[85vw] flex-col overflow-y-auto rounded-r-panel border-r bg-white p-5 shadow-panel backdrop-blur transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:sticky lg:top-4 lg:z-auto lg:max-h-[calc(100vh-2rem)] lg:translate-x-0 lg:overflow-hidden lg:rounded-panel lg:border lg:bg-white lg:shadow-card'
        )}
      >
        {children}
      </aside>
    </>
  );
}
