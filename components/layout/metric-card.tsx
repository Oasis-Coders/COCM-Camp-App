type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="rounded-[24px] border border-camp-forest/10 bg-white/85 p-5 shadow-panel">
      <p className="text-sm uppercase tracking-[0.2em] text-camp-moss">{label}</p>
      <p className="mt-4 font-serif text-4xl text-camp-forest">{value}</p>
      <p className="mt-3 text-sm text-slate-600">{helper}</p>
    </article>
  );
}
