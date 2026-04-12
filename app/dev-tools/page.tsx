import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';

const devToolItems = [
  {
    href: '/dev-tools/users',
    label: 'All App Users',
    description:
      'Review every current account, confirm profile linkage, change roles, reset passwords, and remove users.',
    status: 'Ready',
  },
  {
    href: '/dev-tools',
    label: 'More Tools Soon',
    description:
      'This menu is intentionally structured as a hub so we can keep adding internal tools without changing the main navigation again.',
    status: 'Planned',
  },
] as const;

export default async function DevToolsPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect('/sign-in?redirectTo=/dev-tools');
  }

  return (
    <AppShell title="Dev Tools" eyebrow="Temporary internal tools">
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Tool hub</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Developer menu</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            This page is the entry point for temporary development utilities. Personal account
            details now live under the main Profile tab, while administrative tools stay grouped
            here.
          </p>

          <div className="mt-6 grid gap-4">
            {devToolItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-[24px] border border-camp-forest/10 bg-white px-5 py-5 shadow-panel transition hover:-translate-y-0.5 hover:border-camp-forest/25"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-camp-forest">{item.label}</p>
                    <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                  </div>
                  <span className="rounded-full bg-camp-sky px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-camp-forest">
                    {item.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Current session</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Who is using the tools</h3>
          <dl className="mt-6 grid gap-4 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-camp-moss">Display name</dt>
              <dd>{session.displayName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Email</dt>
              <dd>{session.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Role</dt>
              <dd className="capitalize">{session.role.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Mode</dt>
              <dd>{session.mode}</dd>
            </div>
          </dl>
        </article>
      </div>
    </AppShell>
  );
}
