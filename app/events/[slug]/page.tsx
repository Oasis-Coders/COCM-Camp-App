import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/layout/empty-state";
import { sampleEvents } from "@/lib/app-config";

type EventDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EventDetailPage({ params }: EventDetailProps) {
  const { slug } = await params;
  const event = sampleEvents.find((item) => item.slug === slug);

  if (!event) {
    notFound();
  }

  return (
    <AppShell title={event.title} eyebrow="Event detail">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
          <h3 className="font-serif text-2xl text-camp-forest">Event summary</h3>
          <dl className="mt-4 grid gap-3 text-sm text-slate-700">
            <div>
              <dt className="font-semibold text-camp-moss">Location</dt>
              <dd>{event.location}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Starts</dt>
              <dd>{new Date(event.startsAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="font-semibold text-camp-moss">Ends</dt>
              <dd>{new Date(event.endsAt).toLocaleString()}</dd>
            </div>
          </dl>
        </article>

        <EmptyState
          title="Registrations come next"
          description="The schema and route foundation are in place. Self-service signup and admin registration management are the next implementation slice."
        />
      </div>
    </AppShell>
  );
}
