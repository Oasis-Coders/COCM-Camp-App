import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { getSession } from '@/lib/auth/session';

export default async function DevToolsAccountPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect('/sign-in?redirectTo=/dev-tools/account');
  }

  return (
    <AppShell title="Dev Tools" eyebrow="Temporary internal tools">
      <div className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-camp-moss">Account tools</p>
        <h3 className="mt-3 font-serif text-2xl text-camp-forest">Open to every signed-in user</h3>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Account management now lives in the main Profile area, but this Dev Tools route stays
          available for everyone so it can act as a shared landing page instead of redirecting away.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/profile"
            className="rounded-2xl bg-camp-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-camp-moss"
          >
            Go to Profile
          </Link>
          <Link
            href="/dev-tools"
            className="rounded-2xl border border-camp-forest/10 bg-camp-sand/35 px-5 py-3 text-sm font-semibold text-camp-forest transition hover:bg-camp-sand/60"
          >
            Back to Dev Tools
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
