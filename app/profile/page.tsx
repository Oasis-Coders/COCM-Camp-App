import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';

export default async function ProfilePage() {
  const session = await getSession();

  return (
    <AppShell title="Profile" eyebrow="Authenticated area">
      <article className="max-w-2xl rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <h3 className="font-serif text-2xl text-camp-forest">Current demo identity</h3>
        <dl className="mt-4 grid gap-4 text-sm text-slate-700">
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
        </dl>
      </article>
    </AppShell>
  );
}
