import { redirect } from 'next/navigation';

import { AuthCard } from '@/components/auth/auth-card';
import { getSession } from '@/lib/auth/session';
import { buildSignUpMetadata, sanitizeRedirectTo } from '@/lib/auth/auth-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';

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

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: buildSignUpMetadata({
        firstName,
        lastName,
        preferredName,
      }),
    },
  });

  if (error) {
    redirect(`/sign-up?error=sign-up-failed&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  if (!data.session) {
    redirect(`/sign-in?created=1&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(redirectTo);
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

  const message = params.error
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
