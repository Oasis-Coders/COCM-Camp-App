import { AppShell } from '@/components/layout/app-shell';
import { AdminEventForm } from '../event-form';

export default function NewEventPage() {
  return (
    <AppShell title="Create Event" eyebrow="Staff operations">
      <AdminEventForm />
    </AppShell>
  );
}
