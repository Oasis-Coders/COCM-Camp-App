import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { getSession } from '@/lib/auth/session';

type SignInPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
    sent?: string;
    error?: string;
  }>;
};

async function signInAs(
  role: 'super_admin' | 'admin' | 'staff' | 'participant',
  redirectTo?: string
) {
  'use server';

  const cookieStore = await cookies();

  cookieStore.set('camp-demo-auth', 'true', { httpOnly: true, sameSite: 'lax', path: '/' });
  cookieStore.set('camp-demo-role', role, { httpOnly: true, sameSite: 'lax', path: '/' });
  cookieStore.set('camp-demo-email', `${role}@demo.local`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  cookieStore.set('camp-demo-name', `Demo ${role.replace('_', ' ')}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  redirect(redirectTo || '/dashboard');
}

async function signOut() {
  'use server';

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();

    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete('camp-demo-auth');
  cookieStore.delete('camp-demo-role');
  cookieStore.delete('camp-demo-email');
  cookieStore.delete('camp-demo-name');
  redirect('/');
}

async function requestEmailSignIn(formData: FormData) {
  'use server';

  const email = String(formData.get('email') ?? '').trim();
  const redirectTo = String(formData.get('redirectTo') ?? '/dashboard');

  if (!email) {
    redirect(`/sign-in?error=missing-email&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect(`/sign-in?error=supabase-unavailable&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const callbackUrl = new URL('/auth/callback', appUrl);
  callbackUrl.searchParams.set('redirectTo', redirectTo);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: false,
    },
  });

  if (error) {
    redirect(`/sign-in?error=sign-in&redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  redirect(`/sign-in?sent=1&redirectTo=${encodeURIComponent(redirectTo)}`);
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo;
  const supabaseReady = hasSupabaseEnv();
  const session = await getSession();

  if (session.isAuthenticated) {
    redirect(redirectTo || '/dashboard');
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#d9edf6_0%,_#fcfcf7_45%,_#f4e8c1_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] bg-white/85 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.35em] text-camp-moss">Sign in</p>
        <h1 className="mt-4 font-serif text-4xl text-camp-forest">Access the camp workspace</h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          Use your existing account to receive a secure sign-in link. Once authenticated, the app
          keeps your session alive so opening it from your phone home screen feels much closer to a
          native app.
        </p>

        <div className="mt-6 rounded-2xl border border-camp-forest/10 bg-camp-sand/50 p-4 text-sm text-slate-700">
          Supabase env detected:{' '}
          <span className="font-semibold">{supabaseReady ? 'yes' : 'no'}</span>
        </div>

        {params.sent === '1' ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Check your email for the sign-in link. After opening it once, your session should stay
            active across normal use on desktop and phone.
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            Sign-in could not be completed. Confirm that your account exists and try again.
          </div>
        ) : null}

        {supabaseReady ? (
          <form action={requestEmailSignIn} className="mt-8 rounded-[28px] border border-camp-forest/10 bg-white p-6 shadow-panel">
            <input type="hidden" name="redirectTo" value={redirectTo || '/dashboard'} />
            <label htmlFor="email" className="block text-sm font-semibold text-camp-forest">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 text-base outline-none transition focus:border-camp-forest/40"
            />
            <p className="mt-3 text-sm text-slate-600">
              Sign-up is being tracked separately so this screen stays focused on secure account
              access for existing users.
            </p>
            <button
              type="submit"
              className="mt-5 rounded-full bg-camp-forest px-5 py-3 font-semibold text-white transition hover:bg-camp-moss"
            >
              Email me a sign-in link
            </button>
          </form>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {(['super_admin', 'admin', 'staff', 'participant'] as const).map((role) => (
              <form key={role} action={signInAs.bind(null, role, redirectTo)}>
                <button
                  type="submit"
                  className="w-full rounded-[24px] border border-camp-forest/10 bg-white px-5 py-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-camp-forest/25"
                >
                  <span className="block font-semibold capitalize text-camp-forest">
                    {role.replace('_', ' ')}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600">
                    Enter the app with {role.replace('_', ' ')} navigation and route access.
                  </span>
                </button>
              </form>
            ))}
          </div>
        )}

        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-semibold text-camp-ember">
            Clear demo session
          </button>
        </form>
      </div>
    </main>
  );
}
