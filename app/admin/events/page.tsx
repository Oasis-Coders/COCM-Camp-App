import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { sampleEvents } from '@/lib/app-config';

export default async function AdminEventsPage() {
  return (
    <AppShell title="Admin Events" eyebrow="Staff operations">
      <div className="grid gap-4">
        {sampleEvents.map((event) => (
          <Link
            key={event.id}
            href={`/admin/events/${event.id}`}
            className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel transition hover:border-camp-forest/25"
          >
            <span className="font-semibold text-camp-forest">{event.title}</span>
            <span className="mt-2 block text-sm text-slate-600">Status: {event.status}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
