import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminEventsPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: events } = await supabase
    .from('events')
    .select('id, title, starts_at, location, capacity')
    .order('starts_at', { ascending: false });

  return (
    <AppShell title="Admin Events" eyebrow="Staff operations">
      <div className="mb-6 flex justify-end">
        <Link
          href="/admin/events/new"
          className="rounded-xl bg-camp-ember px-4 py-2 text-sm font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark"
        >
          + New Event
        </Link>
      </div>

      <div className="grid gap-4">
        {events && events.length > 0 ? (
          events.map((event) => (
            <Link
              key={event.id}
              href={`/admin/events/${event.id}`}
              className="rounded-card border border-camp-forest/10 bg-white p-5 shadow-card transition hover:border-camp-forest/25"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className="font-semibold text-camp-forest">{event.title}</span>
                  <span className="mt-1 block text-sm text-camp-moss">
                    {event.location || 'No location set'}
                  </span>
                </div>
                <div className="text-sm text-camp-moss md:text-right">
                  <p>{new Date(event.starts_at).toLocaleDateString()}</p>
                  <p>Capacity: {event.capacity !== null ? event.capacity : 'Unlimited'}</p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-card border border-dashed border-camp-forest/10 bg-white p-8 text-center">
            <p className="text-4xl">📅</p>
            <p className="mt-3 font-serif text-lg text-camp-forest">No events yet</p>
            <p className="mt-1 text-sm text-camp-moss">Get started by creating your first event.</p>
            <Link
              href="/admin/events/new"
              className="mt-4 inline-block rounded-xl bg-camp-ember px-5 py-2 text-sm font-semibold text-white shadow-ember-glow transition-all hover:bg-camp-ember-dark"
            >
              + Create Event
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}
