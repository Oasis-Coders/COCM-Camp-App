import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { hasSupabaseEnv } from '@/lib/supabase/env';

type SignInPageProps = {
  searchParams: Promise<{
    redirectTo?: string;
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

  const cookieStore = await cookies();
  cookieStore.delete('camp-demo-auth');
  cookieStore.delete('camp-demo-role');
  cookieStore.delete('camp-demo-email');
  cookieStore.delete('camp-demo-name');
  redirect('/');
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const redirectTo = params.redirectTo;
  const supabaseReady = hasSupabaseEnv();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#d9edf6_0%,_#fcfcf7_45%,_#f4e8c1_100%)] px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-[32px] bg-white/85 p-8 shadow-panel">
        <p className="text-xs uppercase tracking-[0.35em] text-camp-moss">Sign in</p>
        <h1 className="mt-4 font-serif text-4xl text-camp-forest">
          Choose a demo role to explore the shell
        </h1>
        <p className="mt-4 max-w-2xl text-slate-700">
          This keeps local testing friction low while Supabase project setup happens. The auth
          callback route and server/browser clients are already scaffolded for the real integration.
        </p>

        <div className="mt-6 rounded-2xl border border-camp-forest/10 bg-camp-sand/50 p-4 text-sm text-slate-700">
          Supabase env detected:{' '}
          <span className="font-semibold">{supabaseReady ? 'yes' : 'no'}</span>
        </div>

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

        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-semibold text-camp-ember">
            Clear demo session
          </button>
        </form>
      </div>
    </main>
  );
}
