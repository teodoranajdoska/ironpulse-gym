import './globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { SiteNavbar } from '@/components/site-navbar';
import { APP_NAME } from '@ironpulse/shared';

export const metadata = {
  title: APP_NAME,
  description: 'Gym platform for members, trainers, admins and sponsors.',
};

export default async function RootLayout({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const messages = await getMessages();

  return (
    <html lang="mk">
      <body className="bg-slate-950 text-slate-100 antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <SiteNavbar />
            {children}
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
