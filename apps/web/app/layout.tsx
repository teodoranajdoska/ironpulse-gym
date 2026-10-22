import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { SiteNavbar } from '@/components/site-navbar';
import { APP_NAME } from '@ironpulse/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import { Manrope, Oswald } from 'next/font/google';
import { MotionRuntime } from '@/components/motion-runtime';
import { SiteFooter } from '@/components/site-footer';
import { CookieBanner } from '@/components/cookie-banner';
import { PageTransition } from '@/components/page-transition';
import { ToastProvider } from '@/components/ui/toast';

const displayFont = Oswald({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
});

const sansFont = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
});

export async function generateMetadata() {
  const t = await getTranslations('home');
  return {
    title: APP_NAME,
    description: t('subtitle'),
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const messages = await getMessages();
  const locale = await getLocale();
  const nav = await getTranslations('nav');
  const feedback = await getTranslations('feedback');

  return (
    <html data-theme="dark" lang={locale}>
      <body className={`${displayFont.variable} ${sansFont.variable} antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <ToastProvider dismissLabel={feedback('dismiss')}>
              <a className="skip-link" href="#main-content">
                {nav('skipToContent')}
              </a>
              <SiteNavbar />
              <PageTransition>{children}</PageTransition>
              <SiteFooter />
              <CookieBanner />
              <MotionRuntime />
            </ToastProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
