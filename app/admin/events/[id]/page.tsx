import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";

type AdminEventDetailProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminEventDetailPage({ params }: AdminEventDetailProps) {
  const { id } = await params;

  return (
    <AppShell title={`Event ${id}`} eyebrow="Admin detail">
      <EmptyState
        title="CRUD screens are intentionally light here"
        description="This placeholder gives you the route boundary and layout now so event management forms can land cleanly in the next phase."
      />
    </AppShell>
  );
}
