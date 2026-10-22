import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PricingCard({
  name,
  duration,
  price,
  locale,
  popular = false,
  popularLabel,
  cta,
}: {
  name: string;
  duration: string;
  price: number;
  locale: string;
  popular?: boolean;
  popularLabel: string;
  cta: string;
}): JSX.Element {
  return (
    <article className={`relative flex h-full flex-col rounded-panel border p-6 ${popular ? 'border-brand-lime bg-brand-lime/[0.07] shadow-glow' : 'border-line bg-surface'}`}>
      {popular && <span className="absolute right-5 top-5 rounded-full bg-brand-lime px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-brand-950">{popularLabel}</span>}
      <p className="text-sm text-muted">{duration}</p>
      <h3 className="mt-2 text-xl font-semibold text-foreground">{name}</h3>
      <p className="mt-8 display-font text-4xl font-bold tracking-tightest text-foreground">
        {new Intl.NumberFormat(locale === 'mk' ? 'mk-MK' : 'en-GB').format(price)}
        <span className="ml-2 font-sans text-xs font-medium tracking-normal text-muted"> MKD</span>
      </p>
      <Button asChild className="mt-8 w-full" variant={popular ? 'default' : 'outline'}>
        <Link href="/register">{cta}<ArrowUpRight aria-hidden="true" className="ml-2" size={16} /></Link>
      </Button>
    </article>
  );
}
