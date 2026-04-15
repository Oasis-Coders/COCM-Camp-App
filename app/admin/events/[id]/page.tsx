import { notFound } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
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

  return (
    <AppShell title={`Edit Event`} eyebrow={event.title}>
      <AdminEventForm event={event} />
    </AppShell>
  );
}
