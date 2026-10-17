export function Marquee({ items }: { items: string[] }): JSX.Element {
  const repeated = [...items, ...items];
  return (
    <div aria-label={items.join(', ')} className="overflow-hidden border-y border-line py-5">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {repeated.map((item, index) => (
          <span className="display-font text-2xl font-bold uppercase tracking-tight text-muted/70" key={`${item}-${index}`}>
            {item}<span className="ml-10 text-brand-lime">✳</span>
          </span>
        ))}
      </div>
    </div>
  );
}
