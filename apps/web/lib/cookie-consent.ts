'use client';

import { useEffect, useState } from 'react';

export type CookieConsent = 'accepted' | 'rejected';

const cookieName = 'user_consent';
const consentChangedEvent = 'ironpulse-cookie-consent-change';

function readCookieConsent(): CookieConsent | null {
  const cookieValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);

  return cookieValue === 'accepted' || cookieValue === 'rejected' ? cookieValue : null;
}

export function useCookieConsent(): CookieConsent | null | undefined {
  const [consent, setConsent] = useState<CookieConsent | null>();

  useEffect(() => {
    const syncConsent = (): void => setConsent(readCookieConsent());
    syncConsent();
    window.addEventListener(consentChangedEvent, syncConsent);
    return () => window.removeEventListener(consentChangedEvent, syncConsent);
  }, []);

  return consent;
}

export const openCookieSettingsEvent = 'ironpulse-cookie-settings-open';

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(openCookieSettingsEvent));
}

export function setCookieConsent(consent: CookieConsent): void {
  document.cookie = `${cookieName}=${consent}; Max-Age=31536000; Path=/; SameSite=Lax`;
  window.dispatchEvent(new Event(consentChangedEvent));
}
