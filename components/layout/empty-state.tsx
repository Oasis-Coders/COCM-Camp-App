type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-card border border-dashed border-camp-forest/15 bg-white p-8 text-center shadow-card">
      <h3 className="font-serif text-2xl tracking-tight text-camp-forest">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-camp-moss">{description}</p>
    </div>
  );
}
