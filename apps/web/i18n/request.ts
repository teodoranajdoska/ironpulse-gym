import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const savedLocale = cookies().get('ip_locale')?.value;
  const locale = savedLocale === 'en' ? 'en' : 'mk';
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});
