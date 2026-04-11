import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/layout/metric-card';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { count: eventCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  const { count: activeTaskCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'in_progress', 'blocked']);

  const { count: checkinCount } = await supabase
    .from('checkins')
    .select('*', { count: 'exact', head: true });

  // Get user profile if authenticated
  let registrations = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profile) {
      const { data } = await supabase
        .from('event_registrations')
        .select(
          `
          status,
          registered_at,
          events (
            id,
            title,
            slug,
            location,
            starts_at
          )
        `
        )
        .eq('user_id', profile.id)
        .order('registered_at', { ascending: false });

      registrations = data;
    }
  }

  return (
    <AppShell title="Dashboard" eyebrow="Protected route">
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Open events"
          value={String(eventCount ?? 0)}
          helper="Total events visible to you across all statuses."
        />
        <MetricCard
          label="Active tasks"
          value={String(activeTaskCount ?? 0)}
          helper="Tasks in 'open', 'in progress', or 'blocked' status."
        />
        <MetricCard
          label="Check-ins"
          value={String(checkinCount ?? 0)}
          helper="Total confirmed check-ins across all events."
        />
      </div>

      {user && (
        <section>
          <h2 className="mb-4 font-serif text-xl text-camp-forest">My Registrations</h2>
          <div className="grid gap-4">
            {(registrations || []).length === 0 ? (
              <p className="text-sm text-slate-500">
                You haven&apos;t registered for any events yet.
              </p>
            ) : (
              (registrations || []).map((reg: any, i: number) => (
                <Link
                  key={i}
                  href={`/events/${reg.events.slug}`}
                  className="block rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel transition hover:border-camp-forest/25"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="font-serif text-xl text-camp-forest">{reg.events.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{reg.events.location}</p>
                    </div>
                    <div className="text-sm text-slate-600 md:text-right">
                      <p>
                        Status:{' '}
                        <span
                          className={`font-semibold capitalize ${
                            reg.status === 'waitlisted'
                              ? 'text-amber-600'
                              : reg.status === 'registered'
                                ? 'text-green-600'
                                : 'text-slate-500'
                          }`}
                        >
                          {reg.status}
                        </span>
                      </p>
                      <p>Starts: {new Date(reg.events.starts_at).toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      )}
    </AppShell>
  );
}
