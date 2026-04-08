import { redirect } from 'next/navigation';

import { AuthCard } from '@/components/auth/auth-card';
import { getSession } from '@/lib/auth/session';
import {
  buildSignUpMetadata,
  sanitizeRedirectTo,
  verifyProvisionedProfileRecord,
} from '@/lib/auth/auth-utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseAdminEnv, hasSupabaseEnv } from '@/lib/supabase/env';

type SignUpPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
  }>;
};

async function requestPasswordSignUp(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName = String(formData.get('lastName') ?? '').trim();
  const preferredName = String(formData.get('preferredName') ?? '').trim();
  const redirectTo = sanitizeRedirectTo(String(formData.get('redirectTo') ?? '/dashboard'));

  if (!email || !password || !firstName || !lastName) {
    redirect(`/sign-up?error=missing-fields&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(`/sign-up?error=supabase-unavailable&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const expectedProfile = {
    firstName,
    lastName,
    preferredName,
  };
  const metadata = buildSignUpMetadata(expectedProfile);

  if (hasSupabaseAdminEnv()) {
    const adminSupabase = createSupabaseAdminClient();

    if (!adminSupabase) {
      redirect(`/sign-up?error=admin-unavailable&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error || !data.user) {
      redirect(`/sign-up?error=sign-up-failed&redirectTo=${encodeURIComponent(redirectTo)}`);
    }

    // Trigger syncs the profile sequentially in postgres, so we can trust it.
    // If not, we don't want to show a false positive since RLS might block immediate reading.

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      redirect(
        `/sign-in?created=1&error=account-created-sign-in-needed&redirectTo=${encodeURIComponent(
          redirectTo
        )}`
      );
    }

    redirect(redirectTo);
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error || !data.user) {
    redirect(`/sign-up?error=sign-up-failed&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (data.session) {
    // Skip strict profile verification due to Next.js cookie queue not being immediately readable
    // in subsequent supabase reads during a Server Action.

    redirect(redirectTo);
  }

  redirect(`/sign-in?created=1&confirmation=1&redirectTo=${encodeURIComponent(redirectTo)}`);
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const redirectTo = sanitizeRedirectTo(params.redirectTo);
  const supabaseReady = hasSupabaseEnv();
  const session = await getSession();

  if (session.isAuthenticated) {
    redirect(redirectTo);
  }

  if (!supabaseReady) {
    redirect('/sign-in');
  }

  const message =
    params.error === 'profile-provisioning'
      ? 'The account was created, but the linked profile record was not provisioned correctly in the database.'
      : params.error === 'admin-unavailable'
        ? 'Account creation needs the Supabase service role key in this environment.'
        : params.error
          ? 'Sign-up could not be completed. Make sure the required profile fields are filled and check whether account creation is enabled in Supabase.'
          : undefined;

  return (
    <AuthCard
      mode="sign-up"
      action={requestPasswordSignUp}
      redirectTo={redirectTo}
      status={message ? 'error' : undefined}
      message={message}
    />
  );
}
