import { Dumbbell } from 'lucide-react';

export function MachineCard({
  name,
  category,
  description,
}: {
  name: string;
  category: string;
  description: string;
}): JSX.Element {
  return (
    <article className="rounded-panel border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-brand-lime/40 hover:shadow-glow">
      <div className="mb-8 grid h-12 w-12 place-items-center rounded-2xl bg-brand-lime/10 text-brand-lime"><Dumbbell aria-hidden="true" /></div>
      <p className="text-xs font-semibold uppercase tracking-widest text-brand-lime">{category}</p>
      <h3 className="mt-3 text-xl font-semibold text-foreground">{name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
    </article>
  );
}
