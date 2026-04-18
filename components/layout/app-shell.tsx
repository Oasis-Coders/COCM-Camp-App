import { SignOutButton } from '@/components/auth/sign-out-button';
import { MobileSidebar } from '@/components/layout/mobile-sidebar';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { navItems } from '@/lib/app-config';
import { getSession } from '@/lib/auth/session';

type AppShellProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export async function AppShell({ title, eyebrow, children }: AppShellProps) {
  const session = await getSession();

  const filteredNav = navItems.filter(
    (item) => session.isAuthenticated && (!item.roles || item.roles.includes(session.role))
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(217,237,246,0.75),_transparent_32%),linear-gradient(180deg,_#fcfcf7_0%,_#f6f0df_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-8">
        <MobileSidebar>
          <div className="rounded-[24px] bg-camp-forest p-4 text-white">
            <p className="text-xs uppercase tracking-[0.3em] text-camp-sky">Camp Ops</p>
            <h1 className="mt-2 font-serif text-2xl">Camp Management</h1>
          </div>

          <div className="mt-4 rounded-[24px] border border-camp-forest/10 bg-camp-sand/60 p-3 text-sm">
            <p className="font-semibold text-camp-forest">{session.displayName}</p>
            <p className="text-slate-700">{session.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-camp-forest">
              {session.role.replace('_', ' ')}
            </p>
          </div>

          <div className="mt-5 flex min-h-0 flex-1 flex-col">
            <SidebarNav items={filteredNav} />

            {session.isAuthenticated && (
              <div className="mt-4 border-t border-camp-forest/10 pt-4">
                <SignOutButton />
              </div>
            )}
          </div>
        </MobileSidebar>

        <main className="flex-1">
          <header className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-camp-moss">{eyebrow}</p>
            <h2 className="mt-3 font-serif text-4xl text-camp-forest">{title}</h2>
          </header>

          <section className="mt-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
