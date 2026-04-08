import { notFound } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RegistrationButton } from './registration-button';

type EventDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug, description, location, starts_at, ends_at, capacity, status')
    .eq('slug', slug)
    .single();

  if (!event) {
    notFound();
  }

  // Check if the current user has a registration
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let registrationStatus: 'registered' | 'waitlisted' | 'cancelled' | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profile) {
      const { data: registration } = await supabase
        .from('event_registrations')
        .select('status')
        .match({ event_id: event.id, user_id: profile.id })
        .maybeSingle();

      registrationStatus = (registration?.status as typeof registrationStatus) ?? null;
    }
  }

  // Get registration count
  const { count: registrationCount } = await supabase
    .from('event_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'registered');

  return (
    <AppShell title={event.title} eyebrow="Event detail">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <h3 className="font-serif text-2xl text-camp-forest">Event summary</h3>
          {event.description && <p className="mt-3 text-slate-600">{event.description}</p>}
          <dl className="mt-4 grid gap-3 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-camp-moss">Location</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Starts</dt>
              <dd>{new Date(event.starts_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Ends</dt>
              <dd>{new Date(event.ends_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Registered</dt>
              <dd>
                {registrationCount ?? 0}
                {event.capacity ? ` / ${event.capacity}` : ''}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Status</dt>
              <dd className="capitalize">{event.status}</dd>
            </div>
          </dl>
        </article>

        <div className="flex flex-col gap-4">
          <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
            <h3 className="font-serif text-xl text-camp-forest">Registration</h3>
            {registrationStatus === 'registered' && (
              <p className="mt-3 text-sm text-green-700">✓ You are registered for this event.</p>
            )}
            {registrationStatus === 'waitlisted' && (
              <p className="mt-3 text-sm text-amber-700">
                ⏳ You are on the waitlist for this event.
              </p>
            )}
            {registrationStatus === 'cancelled' && (
              <p className="mt-3 text-sm text-slate-500">
                Your registration was cancelled. You can register again below.
              </p>
            )}
            {!registrationStatus && (
              <p className="mt-3 text-sm text-slate-600">
                Sign up to reserve your spot for this event.
              </p>
            )}
            <div className="mt-4">
              <RegistrationButton eventId={event.id} currentStatus={registrationStatus} />
            </div>
          </article>
        </div>
      </div>
    </AppShell>
  );
}
