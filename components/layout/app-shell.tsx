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
    <div className="min-h-screen bg-camp-cream text-camp-forest">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-4 lg:flex-row lg:px-8">
        <MobileSidebar>
          <div className="rounded-panel bg-camp-forest p-5 text-white shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-camp-sky">
              Camp Ops
            </p>
            <h1 className="mt-2 font-serif text-2xl tracking-tight">Camp Management</h1>
          </div>

          <div className="mt-4 rounded-card border border-camp-forest/10 bg-white p-4 shadow-card">
            <p className="text-sm font-semibold text-camp-forest">{session.displayName}</p>
            <p className="text-sm text-camp-moss">{session.email}</p>
            <p className="mt-2 inline-flex rounded-[10px] bg-camp-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-camp-forest">
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
          <header className="border-camp-forest/8 rounded-panel border bg-white p-6 shadow-card">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-camp-moss">
              {eyebrow}
            </p>
            <h2 className="mt-3 font-serif text-4xl tracking-tight text-camp-forest">{title}</h2>
          </header>

          <section className="mt-6">{children}</section>
        </main>
      </div>
    </div>
  );
}
