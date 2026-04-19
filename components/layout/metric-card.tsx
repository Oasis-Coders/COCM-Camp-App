type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <article className="border-camp-forest/8 rounded-card border bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-camp-moss">{label}</p>
      <p className="mt-4 font-serif text-4xl tracking-tight text-camp-forest">{value}</p>
      <p className="mt-3 text-sm text-camp-moss">{helper}</p>
    </article>
  );
}
