import Link from 'next/link';

import { SignOutButton } from '@/components/auth/sign-out-button';
import { navItems } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';
import { cn } from '@/lib/utils';

type AppShellProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export async function AppShell({ title, eyebrow, children }: AppShellProps) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,237,246,0.75),_transparent_32%),linear-gradient(180deg,_#fcfcf7_0%,_#f6f0df_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-8">
        <aside className="w-full rounded-[28px] border border-camp-forest/10 bg-white/80 p-5 shadow-panel backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:w-80">
          <div className="rounded-[24px] bg-camp-forest p-5 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-camp-sky">Camp Ops</p>
            <h1 className="mt-3 font-serif text-3xl">Infrastructure Scaffold</h1>
            <p className="mt-3 text-sm text-white/80">
              Minimal shell for events, tasks, check-in, and role-aware navigation.
            </p>
          </div>

          <div className="mt-5 rounded-[24px] border border-camp-forest/10 bg-camp-sand/60 p-4 text-sm">
            <p className="font-semibold text-camp-forest">{session.displayName}</p>
            <p className="text-slate-700">{session.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-camp-forest">
              {session.role.replace('_', ' ')}
            </p>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems
              .filter((item) => !item.roles || item.roles.includes(session.role))
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'block rounded-2xl border border-transparent px-4 py-3 transition hover:border-camp-forest/20 hover:bg-white',
                    title === item.label && 'border-camp-forest/15 bg-white'
                  )}
                >
                  <span className="block font-semibold text-camp-forest">{item.label}</span>
                  <span className="block text-sm text-slate-600">{item.description}</span>
                </Link>
              ))}
          </nav>

          {session.isAuthenticated && (
            <div className="mt-4">
              <SignOutButton />
            </div>
          )}
        </aside>

        <main className="flex-1">
          <header className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-camp-moss">{eyebrow}</p>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="font-serif text-4xl text-camp-forest">{title}</h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Demo auth keeps the shell usable immediately. Supabase helpers and route
                  boundaries are ready to wire into a real project as soon as keys are added.
                </p>
              </div>
              <div className="rounded-2xl bg-camp-sky px-4 py-3 text-sm text-camp-forest">
                Mode: <span className="font-semibold">{session.mode}</span>
              </div>
            </div>
          </header>

          <section className="mt-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
