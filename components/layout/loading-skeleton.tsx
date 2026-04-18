/**
 * components/layout/loading-skeleton.tsx
 *
 * Reusable skeleton placeholder that mimics the AppShell page layout.
 * Rendered by each route's loading.tsx as an instant Suspense fallback
 * while the Server Component finishes fetching data.
 *
 * Variants:
 *   - 'default'   — header + 2 content blocks
 *   - 'dashboard' — header + 3 metric cards + calendar block
 *   - 'form'      — header + form-shaped skeleton
 */

type SkeletonVariant = 'default' | 'dashboard' | 'form';

function Pulse({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className ?? ''}`} />;
}

function HeaderSkeleton() {
  return (
    <div className="rounded-[28px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel backdrop-blur">
      <Pulse className="h-3 w-24" />
      <Pulse className="mt-4 h-9 w-64" />
    </div>
  );
}

function DefaultContent() {
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <Pulse className="h-5 w-48" />
        <Pulse className="mt-4 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-3/4" />
        <Pulse className="mt-2 h-4 w-5/6" />
      </div>
      <div className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <Pulse className="h-5 w-36" />
        <Pulse className="mt-4 h-4 w-full" />
        <Pulse className="mt-2 h-4 w-2/3" />
      </div>
    </div>
  );
}

function DashboardContent() {
  return (
    <>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel"
          >
            <Pulse className="h-3 w-20" />
            <Pulse className="mt-3 h-8 w-16" />
            <Pulse className="mt-2 h-3 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
        <Pulse className="h-5 w-32" />
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Pulse key={i} className="h-4 w-full" />
          ))}
        </div>
        <Pulse className="mt-4 h-48 w-full" />
      </div>
    </>
  );
}

function FormContent() {
  return (
    <div className="mt-6 rounded-[24px] border border-camp-forest/10 bg-white/85 p-6 shadow-panel">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={i > 1 ? 'mt-5' : ''}>
          <Pulse className="h-3 w-28" />
          <Pulse className="mt-2 h-10 w-full" />
        </div>
      ))}
      <Pulse className="mt-6 h-10 w-36 rounded-full" />
    </div>
  );
}

export function LoadingSkeleton({ variant = 'default' }: { variant?: SkeletonVariant }) {
  return (
    <div className="flex-1">
      <HeaderSkeleton />
      {variant === 'dashboard' && <DashboardContent />}
      {variant === 'form' && <FormContent />}
      {variant === 'default' && <DefaultContent />}
    </div>
  );
}
