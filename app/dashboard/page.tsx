import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/layout/metric-card';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const { count: eventCount } = await (supabase
    ?.from('events')
    .select('*', { count: 'exact', head: true }) ?? { count: 0 });

  const { count: activeTaskCount } = await (supabase
    ?.from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['todo', 'in_progress']) ?? { count: 0 });

  const { count: checkinCount } = await (supabase
    ?.from('checkins')
    .select('*', { count: 'exact', head: true }) ?? { count: 0 });

  return (
    <AppShell title="Dashboard" eyebrow="Protected route">
      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Open events"
          value={String(eventCount ?? 0)}
          helper="Total events visible to you across all statuses."
        />
        <MetricCard
          label="Active tasks"
          value={String(activeTaskCount ?? 0)}
          helper="Tasks in 'todo' or 'in progress' status."
        />
        <MetricCard
          label="Check-ins"
          value={String(checkinCount ?? 0)}
          helper="Total confirmed check-ins across all events."
        />
      </div>
    </AppShell>
  );
}
