import Link from 'next/link';

import { AppShell } from '@/components/layout/app-shell';
import { buildDirectoryEntries } from '@/lib/dev-tools/user-directory';
import { getSession } from '@/lib/auth/session';
import { hasSupabaseAdminEnv } from '@/lib/supabase/env';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const devToolItems = [
  {
    href: '/dev-tools/account',
    label: 'Account Details',
    description:
      'Inspect and edit the currently signed-in account, including profile fields, email, and password.',
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

async function loadDirectoryEntries() {
  if (!hasSupabaseAdminEnv()) {
    return null;
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    return null;
  }

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, first_name, last_name, preferred_name, display_name');

  if (profilesError) {
    return buildDirectoryEntries({
      authUsers: usersData.users,
      profiles: [],
    });
  }

  return buildDirectoryEntries({
    authUsers: usersData.users,
    profiles: profilesData,
  });
}

export default async function DevToolsPage() {
  const session = await getSession();
  const directoryEntries = await loadDirectoryEntries();

  return (
    <AppShell title="Dev Tools" eyebrow="Temporary internal tools">
      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel xl:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">User directory</p>
              <h3 className="mt-3 font-serif text-2xl text-camp-forest">All app users</h3>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Temporary administrative view of every auth account and whether each one has a
                linked profile row in the app database.
              </p>
            </div>
            <div className="rounded-2xl bg-camp-sky px-4 py-3 text-sm text-camp-forest">
              Total users:{' '}
              <span className="font-semibold">{directoryEntries?.length ?? 'Unavailable'}</span>
            </div>
          </div>

          {directoryEntries ? (
            <div className="mt-6 overflow-x-auto rounded-[20px] border border-camp-forest/10">
              <table className="min-w-full divide-y divide-camp-forest/10 text-sm">
                <thead className="bg-camp-sand/50 text-left text-camp-forest">
                  <tr>
                    <th className="px-4 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Profile</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                    <th className="px-4 py-3 font-semibold">Last sign-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-camp-forest/10 bg-white">
                  {directoryEntries.map((entry) => (
                    <tr key={entry.authUserId}>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-camp-forest">{entry.displayName}</p>
                        <p className="mt-1 text-slate-600">{entry.email}</p>
                        <p className="mt-2 break-all text-xs text-slate-500">
                          Auth: {entry.authUserId}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top capitalize text-slate-700">
                        {entry.role}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
                            entry.profileStatus === 'linked'
                              ? 'bg-emerald-100 text-emerald-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {entry.profileStatus}
                        </span>
                        <p className="mt-2 break-all text-xs text-slate-500">
                          {entry.profileId
                            ? `Profile: ${entry.profileId}`
                            : 'No linked profile row'}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Unknown'}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        {entry.lastSignInAt
                          ? new Date(entry.lastSignInAt).toLocaleString()
                          : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              The full user directory needs `SUPABASE_SERVICE_ROLE_KEY` so this environment can read
              all auth users and profile rows.
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Tool hub</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Developer menu</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            This page is the entry point for temporary development utilities. Each tool gets its own
            route so we can expand the set without cluttering the main app shell.
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
