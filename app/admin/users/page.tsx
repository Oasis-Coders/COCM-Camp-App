import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";

export default async function AdminUsersPage() {
  return (
    <AppShell title="Admin Users" eyebrow="Staff operations">
      <EmptyState
        title="User management comes after auth hookup"
        description="Profiles, roles, and user_roles tables are already modeled in SQL. The next layer is wiring real Supabase-authenticated user records into this screen."
      />
    </AppShell>
  );
}
