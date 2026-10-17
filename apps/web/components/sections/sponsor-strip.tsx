export function SponsorStrip({ sponsors }: { sponsors: string[] }): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5 border-y border-line py-8">
      {sponsors.map((sponsor) => (
        <span className="display-font text-xl font-semibold uppercase tracking-wide text-muted/70" key={sponsor}>{sponsor}</span>
      ))}
    </div>
  );
}
