import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";

export default async function CheckInPage() {
  return (
    <AppShell title="Check-in" eyebrow="Operational area">
      <EmptyState
        title="Scanner flow deferred to Phase 2"
        description="This route is already protected and ready for staff workflows. Next implementation steps are QR verification, manual lookup, and attendance reconciliation."
      />
    </AppShell>
  );
}
