import { describe, expect, it } from 'vitest';

import { navItems, sampleEvents, sampleTasks } from '@/lib/app-config';

describe('app scaffold config', () => {
  it('includes the primary product areas in navigation', () => {
    expect(navItems.map((item) => item.href)).toEqual(
      expect.arrayContaining(['/dashboard', '/events', '/tasks', '/check-in', '/profile', '/admin'])
    );
  });

  it('ships with sample data for the shell', () => {
    expect(sampleEvents.length).toBeGreaterThan(0);
    expect(sampleTasks.length).toBeGreaterThan(0);
  });
});
