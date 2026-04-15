import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

type AdminEventRegistrationsProps = {
  params: Promise<{
    id: string;
  }>;
};

import { AttendeeRow } from './attendee-row';

// Internal component for listing attendees by status
function AttendeeList({
  eventId,
  title,
  attendees,
  count,
  capacity,
}: {
  eventId: string;
  title: string;
  attendees: any[];
  count: number;
  capacity?: number | null;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-4 font-serif text-xl text-camp-forest">
        {title} ({count} {capacity ? `/ ${capacity}` : ''})
      </h2>
      <div className="overflow-hidden rounded-[24px] border border-camp-forest/10 bg-white/85 p-1 shadow-panel">
        {attendees.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">No attendees.</p>
        ) : (
          <div className="divide-y divide-slate-200">
            {attendees.map((a: any) => (
              <AttendeeRow key={a.id} eventId={eventId} attendee={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default async function AdminEventRegistrationsPage({
  params,
}: AdminEventRegistrationsProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: event } = await supabase
    .from('events')
    .select('title, capacity')
    .eq('id', id)
    .single();

  if (!event) return notFound();

  const { data: registrations } = await supabase
    .from('event_registrations')
    .select(
      `
      id,
      status,
      notes,
      registered_at,
      profiles (
        first_name,
        last_name,
        email,
        display_name
      )
    `
    )
    .eq('event_id', id)
    .order('registered_at', { ascending: true });

  const grouped = {
    registered: registrations?.filter((r) => r.status === 'registered') || [],
    waitlisted: registrations?.filter((r) => r.status === 'waitlisted') || [],
    cancelled: registrations?.filter((r) => r.status === 'cancelled') || [],
  };

  return (
    <AppShell title={`Registrations`} eyebrow={event.title}>
      <AttendeeList
        eventId={id}
        title="Registered"
        attendees={grouped.registered}
        count={grouped.registered.length}
        capacity={event.capacity}
      />
      <AttendeeList
        eventId={id}
        title="Waitlisted"
        attendees={grouped.waitlisted}
        count={grouped.waitlisted.length}
      />
      <AttendeeList
        eventId={id}
        title="Cancelled"
        attendees={grouped.cancelled}
        count={grouped.cancelled.length}
      />
    </AppShell>
  );
}
