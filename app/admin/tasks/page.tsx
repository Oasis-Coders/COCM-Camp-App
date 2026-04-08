import { AppShell } from '@/components/layout/app-shell';
import { EmptyState } from '@/components/layout/empty-state';

export default async function AdminTasksPage() {
  return (
    <AppShell title="Admin Tasks" eyebrow="Staff operations">
      <EmptyState
        title="Task management scaffolded"
        description="The admin route exists, the tasks table is in the first migration, and the CI pipeline will validate future app changes here."
      />
    </AppShell>
  );
}
