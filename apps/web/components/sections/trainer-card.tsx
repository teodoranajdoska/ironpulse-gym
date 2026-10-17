import { UserRound } from 'lucide-react';

export function TrainerCard({
  name,
  specialty,
  bio,
}: {
  name: string;
  specialty: string;
  bio: string;
}): JSX.Element {
  return (
    <article className="rounded-panel border border-line bg-surface p-6">
      <div className="mb-6 grid h-14 w-14 place-items-center rounded-full bg-raised text-brand-lime"><UserRound aria-hidden="true" /></div>
      <h3 className="text-xl font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm font-semibold text-brand-lime">{specialty}</p>
      <p className="mt-4 text-sm leading-relaxed text-muted">{bio}</p>
    </article>
  );
}
