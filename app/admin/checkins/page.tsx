import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";

export default async function AdminCheckinsPage() {
  return (
    <AppShell title="Admin Check-ins" eyebrow="Staff operations">
      <EmptyState
        title="Attendance operations ready for implementation"
        description="You now have the route, navigation, and database shape for check-ins. Scanner or manual entry can slot in without restructuring the repo."
      />
    </AppShell>
  );
}
