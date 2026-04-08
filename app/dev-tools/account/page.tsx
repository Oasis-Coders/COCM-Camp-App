import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import {
  buildSignUpMetadata,
  hasCredentialChanges,
  normalizeEditableAccountInput,
  resolveDisplayName,
} from '@/lib/auth/auth-utils';
import { getSession } from '@/lib/auth/session';
import { hasSupabaseEnv } from '@/lib/supabase/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AccountToolPageProps = {
  searchParams: Promise<{
    profile?: string;
    credentials?: string;
  }>;
};

type AccountProfile = {
  id: string;
  auth_user_id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
  display_name: string | null;
};

async function updateProfile(formData: FormData) {
  'use server';

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect('/dev-tools/account?profile=unavailable');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?redirectTo=/dev-tools/account');
  }

  const input = normalizeEditableAccountInput({
    firstName: String(formData.get('firstName') ?? ''),
    lastName: String(formData.get('lastName') ?? ''),
    preferredName: String(formData.get('preferredName') ?? ''),
  });

  if (!input.firstName || !input.lastName) {
    redirect('/dev-tools/account?profile=missing-fields');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name: input.firstName,
      last_name: input.lastName,
      preferred_name: input.preferredName || null,
    })
    .eq('auth_user_id', user.id);

  if (profileError) {
    redirect('/dev-tools/account?profile=error');
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: buildSignUpMetadata(input),
  });

  if (metadataError) {
    redirect('/dev-tools/account?profile=metadata-error');
  }

  revalidatePath('/dev-tools');
  revalidatePath('/dev-tools/account');
  revalidatePath('/profile');
  redirect('/dev-tools/account?profile=saved');
}

async function updateCredentials(formData: FormData) {
  'use server';

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect('/dev-tools/account?credentials=unavailable');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in?redirectTo=/dev-tools/account');
  }

  const input = normalizeEditableAccountInput({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  });

  if (!hasCredentialChanges(input, user.email)) {
    redirect('/dev-tools/account?credentials=no-change');
  }

  const payload: { email?: string; password?: string } = {};

  if (input.email && input.email !== (user.email ?? '')) {
    payload.email = input.email;
  }

  if (input.password) {
    payload.password = input.password;
  }

  const { data, error } = await supabase.auth.updateUser(payload);

  if (error) {
    redirect('/dev-tools/account?credentials=error');
  }

  if (payload.email && data.user?.email === payload.email) {
    await supabase.from('profiles').update({ email: payload.email }).eq('auth_user_id', user.id);
  }

  revalidatePath('/dev-tools');
  revalidatePath('/dev-tools/account');
  revalidatePath('/profile');
  redirect('/dev-tools/account?credentials=saved');
}

async function loadAccountProfile() {
  const session = await getSession();

  if (!hasSupabaseEnv()) {
    return {
      session,
      userId: null as string | null,
      profile: null as AccountProfile | null,
    };
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      session,
      userId: null as string | null,
      profile: null as AccountProfile | null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      session,
      userId: null as string | null,
      profile: null as AccountProfile | null,
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, auth_user_id, email, first_name, last_name, preferred_name, display_name')
    .eq('auth_user_id', user.id)
    .maybeSingle<AccountProfile>();

  return {
    session,
    userId: user.id,
    profile: profile ?? null,
  };
}

function getProfileMessage(status: string | undefined) {
  switch (status) {
    case 'saved':
      return {
        tone: 'success' as const,
        text: 'Profile details updated successfully.',
      };
    case 'missing-fields':
      return {
        tone: 'error' as const,
        text: 'First name and last name are required for the profile record.',
      };
    case 'metadata-error':
      return {
        tone: 'error' as const,
        text: 'Profile row was updated, but the auth metadata refresh failed.',
      };
    case 'error':
      return {
        tone: 'error' as const,
        text: 'Profile details could not be saved.',
      };
    case 'unavailable':
      return {
        tone: 'error' as const,
        text: 'Supabase is not configured in this environment.',
      };
    default:
      return null;
  }
}

function getCredentialMessage(status: string | undefined) {
  switch (status) {
    case 'saved':
      return {
        tone: 'success' as const,
        text: 'Credential changes submitted. Email updates may still require Supabase confirmation, depending on project settings.',
      };
    case 'no-change':
      return {
        tone: 'error' as const,
        text: 'Enter a new email, a new password, or both before saving.',
      };
    case 'error':
      return {
        tone: 'error' as const,
        text: 'Credential changes could not be applied.',
      };
    case 'unavailable':
      return {
        tone: 'error' as const,
        text: 'Supabase is not configured in this environment.',
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

export default async function AccountToolPage({ searchParams }: AccountToolPageProps) {
  const params = await searchParams;
  const { session, userId, profile } = await loadAccountProfile();
  const profileMessage = getProfileMessage(params.profile);
  const credentialMessage = getCredentialMessage(params.credentials);

  const displayName = resolveDisplayName({
    displayName: profile?.display_name ?? session.displayName,
    fullName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || undefined,
    email: profile?.email ?? session.email,
  });

  return (
    <AppShell title="Dev Tools" eyebrow="Temporary internal tools">
      <div className="mb-6">
        <Link href="/dev-tools" className="text-sm font-semibold text-camp-forest underline">
          Back to Dev Tools menu
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Current identity</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Credential snapshot</h3>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Development surface for viewing and editing the currently signed-in account.
          </p>

          <dl className="mt-6 grid gap-4 text-sm text-slate-700 md:grid-cols-2">
            <div>
              <dt className="font-semibold text-camp-moss">Mode</dt>
              <dd>{session.mode}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Role</dt>
              <dd className="capitalize">{session.role.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Display name</dt>
              <dd>{displayName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Email</dt>
              <dd>{profile?.email ?? session.email}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Auth user ID</dt>
              <dd className="break-all text-xs">{userId ?? 'Unavailable in demo mode'}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Profile ID</dt>
              <dd className="break-all text-xs">{profile?.id ?? 'No profile row found'}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Notes</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">How this tool behaves</h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li>Profile edits update the `profiles` row and Supabase auth metadata together.</li>
            <li>Email and password updates affect the currently signed-in account only.</li>
            <li>Email changes may trigger confirmation depending on Supabase Auth settings.</li>
            <li>This route is temporary and intended for development/testing only.</li>
          </ul>
        </article>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Profile editor</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Edit profile fields</h3>

          {profileMessage ? (
            <div className="mt-4">
              <Alert {...profileMessage} />
            </div>
          ) : null}

          {hasSupabaseEnv() ? (
            <form action={updateProfile} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-sm font-semibold text-camp-forest"
                  >
                    First name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    autoComplete="given-name"
                    defaultValue={profile?.first_name ?? ''}
                    className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 outline-none transition focus:border-camp-forest/40"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-sm font-semibold text-camp-forest"
                  >
                    Last name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    autoComplete="family-name"
                    defaultValue={profile?.last_name ?? ''}
                    className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 outline-none transition focus:border-camp-forest/40"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="preferredName"
                  className="block text-sm font-semibold text-camp-forest"
                >
                  Preferred name <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="preferredName"
                  name="preferredName"
                  type="text"
                  autoComplete="nickname"
                  defaultValue={profile?.preferred_name ?? ''}
                  className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 outline-none transition focus:border-camp-forest/40"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-camp-forest px-5 py-3 font-semibold text-white transition hover:bg-camp-moss"
              >
                Save profile
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-600">
              Supabase is not configured here, so this environment can only show demo identity
              details and cannot persist profile edits.
            </p>
          )}
        </article>

        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Credential editor</p>
          <h3 className="mt-3 font-serif text-2xl text-camp-forest">Update login details</h3>

          {credentialMessage ? (
            <div className="mt-4">
              <Alert {...credentialMessage} />
            </div>
          ) : null}

          {hasSupabaseEnv() ? (
            <form action={updateCredentials} className="mt-6 space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-camp-forest">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={profile?.email ?? session.email}
                  className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 outline-none transition focus:border-camp-forest/40"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-camp-forest">
                  New password <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Leave blank to keep the current password"
                  className="mt-3 w-full rounded-2xl border border-camp-forest/15 px-4 py-3 outline-none transition focus:border-camp-forest/40"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-camp-forest px-5 py-3 font-semibold text-white transition hover:bg-camp-moss"
              >
                Save credentials
              </button>
            </form>
          ) : (
            <p className="mt-6 text-sm text-slate-600">
              Credential editing requires a real Supabase-backed session.
            </p>
          )}
        </article>
      </div>
    </AppShell>
  );
}
