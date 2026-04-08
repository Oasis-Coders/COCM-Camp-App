import { AppShell } from '@/components/layout/app-shell';
import { MetricCard } from '@/components/layout/metric-card';

export default async function DashboardPage() {
  return (
    <AppShell title="Dashboard" eyebrow="Protected route">
      <div className="grid gap-5 md:grid-cols-3">
        <MetricCard
          label="Open events"
          value="2"
          helper="One published event and one draft are seeded into the scaffold."
        />
        <MetricCard
          label="Active tasks"
          value="3"
          helper="Task flows are ready for role-aware expansion in the next phase."
        />
        <MetricCard
          label="Check-in mode"
          value="Ready"
          helper="Basic staff route exists now, scanner logic comes next."
        />
      </div>
    </AppShell>
  );
}
