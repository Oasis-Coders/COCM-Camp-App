type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-[24px] border border-dashed border-camp-forest/20 bg-white/70 p-8 text-center shadow-panel">
      <h3 className="font-serif text-2xl text-camp-forest">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-slate-600">{description}</p>
    </div>
  );
}
