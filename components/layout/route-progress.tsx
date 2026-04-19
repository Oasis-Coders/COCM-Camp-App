/**
 * components/layout/route-progress.tsx
 *
 * Thin animated progress bar at the top of the viewport.
 * Starts when an internal link is clicked, completes when the pathname changes.
 * Gives users immediate visual feedback that navigation is in progress.
 */
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export function RouteProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPathRef = useRef(pathname);

  const start = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setVisible(true);
    setProgress(30);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + (90 - p) * 0.1;
      });
    }, 300);
  }, []);

  const complete = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  }, []);

  // Complete progress when pathname/searchParams change
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      complete();
      prevPathRef.current = pathname;
    }
  }, [pathname, complete]);

  // Intercept clicks on internal links to start the progress bar
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:'))
        return;
      // Don't start for same-page links
      if (href === pathname) return;
      start();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [pathname, start]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] h-[3px]">
      <div
        className="h-full bg-camp-ember transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
