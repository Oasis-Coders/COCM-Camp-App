import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";

const adminLinks = [
  { href: "/admin/events", label: "Manage events" },
  { href: "/admin/tasks", label: "Manage tasks" },
  { href: "/admin/checkins", label: "Manage check-ins" },
  { href: "/admin/users", label: "Manage users" }
];

export default async function AdminPage() {
  return (
    <AppShell title="Admin" eyebrow="Restricted route">
      <div className="grid gap-4 md:grid-cols-2">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel transition hover:border-camp-forest/25"
          >
            <span className="font-semibold text-camp-forest">{link.label}</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
