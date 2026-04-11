import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { buildDirectoryEntries, normalizePasswordResetInput } from '@/lib/dev-tools/user-directory';
import { getSession } from '@/lib/auth/session';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { hasSupabaseAdminEnv } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import { RoleChangeForm } from './role-change-form';

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

async function loadCurrentAuthUserId() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function resetUserPassword(formData: FormData) {
  'use server';

  const userId = String(formData.get('userId') ?? '');
  const nextPassword = normalizePasswordResetInput(String(formData.get('password') ?? ''));

  if (!nextPassword) {
    redirect('/dev-tools/users?directory=password-missing');
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    redirect('/dev-tools/users?directory=unavailable');
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password: nextPassword,
  });

  if (error) {
    redirect('/dev-tools/users?directory=password-error');
  }

  revalidatePath('/dev-tools/users');
  redirect('/dev-tools/users?directory=password-reset');
}

async function removeUser(formData: FormData) {
  'use server';

  const userId = String(formData.get('userId') ?? '');
  const currentUserId = String(formData.get('currentUserId') ?? '');

  if (!userId || userId === currentUserId) {
    redirect('/dev-tools/users?directory=remove-blocked');
  }

  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    redirect('/dev-tools/users?directory=unavailable');
  }

  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    redirect('/dev-tools/users?directory=remove-error');
  }

  revalidatePath('/dev-tools/users');
  redirect('/dev-tools/users?directory=removed');
}

function getDirectoryMessage(status: string | undefined) {
  switch (status) {
    case 'role-updated':
      return {
        tone: 'success' as const,
        text: 'User role updated successfully.',
      };
    case 'current-role-updated':
      return {
        tone: 'success' as const,
        text: 'User role updated successfully. Reload the app if your own navigation should change immediately.',
      };
    case 'password-reset':
      return {
        tone: 'success' as const,
        text: 'Password reset completed for that user.',
      };
    case 'removed':
      return {
        tone: 'success' as const,
        text: 'User removed successfully.',
      };
    case 'remove-blocked':
      return {
        tone: 'error' as const,
        text: 'The current signed-in user cannot remove their own account from this screen.',
      };
    case 'password-missing':
      return {
        tone: 'error' as const,
        text: 'Enter a new password before submitting a reset.',
      };
    case 'role-error':
      return {
        tone: 'error' as const,
        text: 'The role change could not be completed.',
      };
    case 'password-error':
      return {
        tone: 'error' as const,
        text: 'The password reset could not be completed.',
      };
    case 'remove-error':
      return {
        tone: 'error' as const,
        text: 'The user could not be removed.',
      };
    case 'unavailable':
      return {
        tone: 'error' as const,
        text: 'This environment needs the Supabase service role key for admin actions.',
      };
    default:
      return null;
  }
}

function Alert({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-rose-200 bg-rose-50 text-rose-900'
      }`}
    >
      {text}
    </div>
  );
}

export default async function DevToolsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ directory?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  const directoryEntries = await loadDirectoryEntries();
  const currentAuthUserId = await loadCurrentAuthUserId();
  const directoryMessage = getDirectoryMessage(params.directory);

  return (
    <AppShell title="Dev Tools" eyebrow="Temporary internal tools">
      <div className="mb-6">
        <Link href="/dev-tools" className="text-sm font-semibold text-camp-forest underline">
          Back to Dev Tools menu
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel xl:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">User directory</p>
              <h3 className="mt-3 font-serif text-2xl text-camp-forest">All app users</h3>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Administrative view of every auth account and whether each one has a linked profile
                row in the app database.
              </p>
            </div>
            <div className="rounded-2xl bg-camp-sky px-4 py-3 text-sm text-camp-forest">
              Total users:{' '}
              <span className="font-semibold">{directoryEntries?.length ?? 'Unavailable'}</span>
            </div>
          </div>

          {directoryMessage ? (
            <div className="mt-4">
              <Alert {...directoryMessage} />
            </div>
          ) : null}

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
                    <th className="px-4 py-3 font-semibold">Actions</th>
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
                        {entry.role.replace('_', ' ')}
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
                      <td className="px-4 py-4 align-top">
                        <div className="min-w-56 space-y-4">
                          <RoleChangeForm
                            authUserId={entry.authUserId}
                            currentAuthUserId={currentAuthUserId ?? ''}
                            initialRole={entry.role}
                          />

                          <form action={resetUserPassword} className="space-y-2">
                            <input type="hidden" name="userId" value={entry.authUserId} />
                            <label
                              htmlFor={`password-${entry.authUserId}`}
                              className="block text-xs font-semibold uppercase tracking-[0.2em] text-camp-moss"
                            >
                              Reset password
                            </label>
                            <div className="flex gap-2">
                              <input
                                id={`password-${entry.authUserId}`}
                                name="password"
                                type="text"
                                placeholder="Temporary password"
                                className="w-full rounded-xl border border-camp-forest/15 px-3 py-2 text-sm outline-none focus:border-camp-forest/40"
                              />
                              <button
                                type="submit"
                                className="rounded-xl bg-camp-sky px-3 py-2 text-sm font-semibold text-camp-forest transition hover:bg-[#b9dceb]"
                              >
                                Reset
                              </button>
                            </div>
                          </form>

                          <form action={removeUser}>
                            <input type="hidden" name="userId" value={entry.authUserId} />
                            <input
                              type="hidden"
                              name="currentUserId"
                              value={currentAuthUserId ?? ''}
                            />
                            <button
                              type="submit"
                              className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                            >
                              Remove user
                            </button>
                          </form>
                        </div>
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
