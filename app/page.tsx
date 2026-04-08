import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,_#fcfcf7_0%,_#f4e8c1_52%,_#d9edf6_100%)] px-4 py-8 text-slate-950 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] bg-camp-forest p-8 text-white shadow-panel lg:p-12">
          <p className="text-xs uppercase tracking-[0.35em] text-camp-sky">
            Phase 0 Infrastructure
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-tight">
            Camp operations infrastructure with a clickable shell from day one.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/80">
            This starter gives you a Next.js app shell, route protection, Supabase-ready auth
            utilities, PWA metadata, SQL migrations, and GitHub Actions CI without waiting on the
            full product build.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/sign-in"
              className="rounded-full bg-camp-sand px-5 py-3 font-semibold text-camp-forest transition hover:bg-white"
            >
              Open demo app
            </Link>
            <a
              href="https://vercel.com/new"
              className="rounded-full border border-white/30 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Connect Vercel later
            </a>
          </div>
        </section>

        <section className="grid gap-6">
          <article className="rounded-[28px] bg-white/85 p-6 shadow-panel">
            <p className="text-sm uppercase tracking-[0.2em] text-camp-moss">What is included</p>
            <ul className="mt-4 space-y-3 text-slate-700">
              <li>Next.js App Router + TypeScript + Tailwind foundation</li>
              <li>Role-aware page shell and middleware route guards</li>
              <li>Supabase-ready envs, helper clients, schema migrations, and seed data</li>
              <li>GitHub Actions for lint, typecheck, test, build, and DB checks</li>
            </ul>
          </article>

          <article className="rounded-[28px] border border-camp-forest/10 bg-white/70 p-6 shadow-panel">
            <p className="text-sm uppercase tracking-[0.2em] text-camp-moss">Immediate next step</p>
            <p className="mt-4 text-slate-700">
              Use the demo sign-in to test navigation locally, then add your Supabase and
              GitHub/Vercel secrets to activate the real pipeline.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
