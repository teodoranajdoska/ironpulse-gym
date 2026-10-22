import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';

export async function generateMetadata() {
  const t = await getTranslations('contact');
  return { title: t('pageTitle') };
}

export default function ContactLayout({ children }: { children: ReactNode }): JSX.Element {
  return <>{children}</>;
}
