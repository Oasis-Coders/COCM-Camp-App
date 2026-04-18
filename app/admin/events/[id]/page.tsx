import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminEventForm } from '../event-form';

type AdminEventDetailProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEventDetailPage({ params }: AdminEventDetailProps) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, location, starts_at, ends_at, capacity')
    .eq('id', id)
    .single();

  if (!event) return notFound();

  // Load profiles for the mandatory participants selector
  const adminSupabase = createSupabaseAdminClient();
  const readClient = adminSupabase ?? supabase;

  const { data: profileRows } = await readClient
    .from('profiles')
    .select('id, display_name, email')
    .order('display_name', { ascending: true });

  const profiles = (profileRows ?? []).map((row) => ({
    id: row.id as string,
    displayName: (row.display_name as string) ?? (row.email as string)?.split('@')[0] ?? 'User',
    email: (row.email as string) ?? '',
  }));

  // Load current mandatory attendees for this event
  const { data: mandatoryRegs } = await readClient
    .from('event_registrations')
    .select('user_id')
    .eq('event_id', id)
    .eq('is_mandatory', true);

  const mandatoryAttendeeIds = (mandatoryRegs ?? []).map((r) => r.user_id as string);

  return (
    <AppShell title={`Edit Event`} eyebrow={event.title}>
      <AdminEventForm
        event={event}
        profiles={profiles}
        mandatoryAttendeeIds={mandatoryAttendeeIds}
      />
    </AppShell>
  );
}
