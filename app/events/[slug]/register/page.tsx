/**
 * app/events/[slug]/register/page.tsx
 *
 * Dedicated registration form page for a single event.
 *
 * Guards:
 *   - Returns 404 if the Supabase client is unavailable or the event slug is invalid.
 *   - Redirects back to /events/[slug] if the user already holds an active registration
 *     (registered or waitlisted) — prevents double-submission.
 *
 * Renders:
 *   - RegistrationForm — a 20+ field client component mirroring the COCM Jotform structure.
 *     On submit the form payload is serialised as JSON into the event_registrations.notes column.
 */
import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { RegistrationForm } from './registration-form';

type RegisterPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return notFound();

  const { data: event } = await supabase
    .from('events')
    .select('id, title, slug')
    .eq('slug', slug)
    .single();

  if (!event) return notFound();

  // Redirect if already registered
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();
    if (profile) {
      const { data: existingReg } = await supabase
        .from('event_registrations')
        .select('status')
        .match({ event_id: event.id, user_id: profile.id })
        .maybeSingle();

      if (
        existingReg &&
        (existingReg.status === 'registered' || existingReg.status === 'waitlisted')
      ) {
        redirect(`/events/${slug}`);
      }
    }
  }

  return (
    <AppShell title={`Register`} eyebrow={event.title}>
      <div className="mx-auto max-w-2xl rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <RegistrationForm eventId={event.id} />
      </div>
    </AppShell>
  );
}
