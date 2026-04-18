import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AdminEventForm } from '../event-form';

export default async function NewEventPage() {
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();
  const readClient = adminSupabase ?? supabase;

  let profiles: { id: string; displayName: string; email: string }[] = [];

  if (readClient) {
    const { data: profileRows } = await readClient
      .from('profiles')
      .select('id, display_name, email')
      .order('display_name', { ascending: true });

    profiles = (profileRows ?? []).map((row) => ({
      id: row.id as string,
      displayName: (row.display_name as string) ?? (row.email as string)?.split('@')[0] ?? 'User',
      email: (row.email as string) ?? '',
    }));
  }

  return (
    <AppShell title="Create Event" eyebrow="Staff operations">
      <AdminEventForm profiles={profiles} />
    </AppShell>
  );
}
