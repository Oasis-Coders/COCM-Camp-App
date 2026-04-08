import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { sampleEvents } from "@/lib/app-config";

export default async function EventsPage() {
  return (
    <AppShell title="Events" eyebrow="Authenticated area">
      <div className="grid gap-4">
        {sampleEvents.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.slug}`}
            className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel transition hover:border-camp-forest/25"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-serif text-2xl text-camp-forest">{event.title}</h3>
                <p className="mt-2 text-slate-600">{event.location}</p>
              </div>
              <div className="text-sm text-slate-600">
                <p>Status: <span className="font-semibold capitalize">{event.status}</span></p>
                <p>Starts: {new Date(event.startsAt).toLocaleString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
