'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

type Theme = 'dark' | 'light';

export function ThemeToggle(): JSX.Element {
  const t = useTranslations('nav');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('ironpulse-theme');
    const nextTheme: Theme = saved === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    const syncTheme = (event: Event): void => {
      const selected = (event as CustomEvent<Theme>).detail;
      setTheme(selected);
      document.documentElement.dataset.theme = selected;
    };
    window.addEventListener('ironpulse-theme-change', syncTheme);
    return () => window.removeEventListener('ironpulse-theme-change', syncTheme);
  }, []);

  function toggleTheme(): void {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem('ironpulse-theme', nextTheme);
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent<Theme>('ironpulse-theme-change', { detail: nextTheme }));
  }

  return (
    <button
      aria-label={theme === 'dark' ? t('lightTheme') : t('darkTheme')}
      className="theme-toggle inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-foreground transition hover:border-brand-lime hover:text-brand-lime"
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? <Sun aria-hidden="true" size={17} /> : <Moon aria-hidden="true" size={17} />}
    </button>
  );
}
