import { AppShell } from '@/components/layout/app-shell';
import { AccountSettings } from '@/components/profile/account-settings';

type ProfilePageProps = {
  searchParams: Promise<{
    profile?: string;
    credentials?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  return (
    <AppShell title="Profile" eyebrow="Authenticated area">
      <AccountSettings searchParams={params} />
    </AppShell>
  );
}
