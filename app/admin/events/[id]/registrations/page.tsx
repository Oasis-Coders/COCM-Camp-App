import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { staffPrivilegedRoles, type AppRole } from '@/lib/app-config';
import { notFound, redirect } from 'next/navigation';

type AdminEventRegistrationsProps = {
  params: Promise<{
    id: string;
  }>;
};

import { AttendeeRow } from './attendee-row';
import { AddParticipantForm } from './add-participant-form';

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

  // Verify user is authenticated and staff+
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/sign-in');
  }

  const role = (user.app_metadata?.role as string) ?? 'participant';
  if (!staffPrivilegedRoles.includes(role as AppRole)) {
    redirect('/dashboard');
  }

  // Use admin client for all DB reads to bypass RLS
  const adminClient = createSupabaseAdminClient();
  if (!adminClient) return null;

  const { data: event } = await adminClient
    .from('events')
    .select('title, capacity')
    .eq('id', id)
    .single();

  if (!event) return notFound();

  const [{ data: registrations }, { data: profileRows }] = await Promise.all([
    adminClient
      .from('event_registrations')
      .select(
        `
        id,
        user_id,
        status,
        notes,
        is_mandatory,
        registered_at,
        profiles (
          id,
          first_name,
          last_name,
          email,
          display_name
        )
      `
      )
      .eq('event_id', id)
      .order('registered_at', { ascending: true }),
    adminClient
      .from('profiles')
      .select('id, display_name, email')
      .order('display_name', { ascending: true }),
  ]);

  const profiles = (profileRows ?? []).map((row: any) => ({
    id: row.id as string,
    displayName: (row.display_name as string) ?? (row.email as string)?.split('@')[0] ?? 'User',
    email: (row.email as string) ?? '',
  }));

  const existingUserIds = (registrations ?? [])
    .filter((r: any) => r.status !== 'cancelled')
    .map((r: any) => r.user_id as string);

  const grouped = {
    registered: registrations?.filter((r: any) => r.status === 'registered') || [],
    waitlisted: registrations?.filter((r: any) => r.status === 'waitlisted') || [],
    cancelled: registrations?.filter((r: any) => r.status === 'cancelled') || [],
  };

  return (
    <AppShell title={`Registrations`} eyebrow={event.title}>
      <AddParticipantForm eventId={id} profiles={profiles} existingUserIds={existingUserIds} />
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
