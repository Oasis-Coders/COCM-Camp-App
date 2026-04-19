/**
 * app/events/page.tsx
 *
 * Public event listing page. Accessible to all authenticated users.
 *
 * Filter behaviour (via ?filter= query param):
 *   - 'upcoming' — only shows events whose starts_at is in the future
 *   - 'past'     — only shows events whose starts_at has already passed (reversed order)
 *   - 'all'      — shows all events (default when param is missing)
 *
 * Each event card links to /events/[slug] for the detail + registration view.
 */
import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type EventsPageProps = {
  searchParams: Promise<{
    filter?: string;
  }>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const { filter } = await searchParams;
  const currentFilter = filter || 'all';

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  let query = supabase
    .from('events')
    .select('id, title, slug, location, starts_at, ends_at, status, capacity')
    .order('starts_at', { ascending: currentFilter !== 'past' });

  const now = new Date().toISOString();

  if (currentFilter === 'upcoming') {
    query = query.gte('starts_at', now);
  } else if (currentFilter === 'past') {
    query = query.lt('starts_at', now);
  }

  const { data: events } = await query;

  return (
    <AppShell title="Events" eyebrow="Authenticated area">
      <div className="mb-6 flex gap-3">
        <Link
          href="/events?filter=all"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            currentFilter === 'all'
              ? 'bg-camp-forest text-white shadow-sm'
              : 'bg-white text-camp-moss shadow-card hover:shadow-card-hover'
          }`}
        >
          All
        </Link>
        <Link
          href="/events?filter=upcoming"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            currentFilter === 'upcoming'
              ? 'bg-camp-forest text-white shadow-sm'
              : 'bg-white text-camp-moss shadow-card hover:shadow-card-hover'
          }`}
        >
          Upcoming
        </Link>
        <Link
          href="/events?filter=past"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
            currentFilter === 'past'
              ? 'bg-camp-forest text-white shadow-sm'
              : 'bg-white text-camp-moss shadow-card hover:shadow-card-hover'
          }`}
        >
          Past
        </Link>
      </div>

      <div className="grid gap-4">
        {(events || []).length === 0 ? (
          <div className="rounded-card border border-dashed border-camp-forest/10 bg-white p-8 text-center">
            <p className="text-4xl">📅</p>
            <p className="mt-3 font-serif text-lg text-camp-forest">No events yet</p>
            <p className="mt-1 text-sm text-camp-moss">Check back soon for upcoming events.</p>
          </div>
        ) : (
          (events || []).map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.slug}`}
              className="rounded-card border border-camp-forest/10 bg-white p-5 shadow-card transition hover:border-camp-forest/25"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-serif text-2xl text-camp-forest">{event.title}</h3>
                  <p className="mt-2 text-camp-moss">{event.location}</p>
                </div>
                <div className="text-sm text-camp-moss">
                  <p>
                    Status: <span className="font-semibold capitalize">{event.status}</span>
                  </p>
                  <p>Starts: {new Date(event.starts_at).toLocaleString()}</p>
                  {event.capacity && (
                    <p>
                      Capacity: <span className="font-semibold">{event.capacity}</span>
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </AppShell>
  );
}
