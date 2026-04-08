import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CheckInList, type EventRegistrationWithProfile } from './check-in-list';

export default async function CheckInPage() {
  const supabase = await createSupabaseServerClient();

  const { data: rawRegistrations } = await (supabase
    ?.from('event_registrations')
    .select(
      `
      id,
      user_id,
      event_id,
      status,
      user:profiles!event_registrations_user_id_fkey(
        first_name, last_name, display_name, email
      ),
      event:events!event_registrations_event_id_fkey(
        title
      )
    `
    )
    .eq('status', 'registered') ?? { data: [] });

  const { data: rawCheckins } = await (supabase?.from('checkins').select('event_id, user_id') ?? {
    data: [],
  });

  const checkedInSet = new Set((rawCheckins || []).map((c) => `${c.event_id}-${c.user_id}`));

  const registrations = ((rawRegistrations as any[]) || []).map((reg) => ({
    ...reg,
    isCheckedIn: checkedInSet.has(`${reg.event_id}-${reg.user_id}`),
  })) as EventRegistrationWithProfile[];

  return (
    <AppShell title="Check-in" eyebrow="Operational area">
      <div className="mx-auto w-full max-w-2xl">
        <CheckInList registrations={registrations} />
      </div>
    </AppShell>
  );
}
