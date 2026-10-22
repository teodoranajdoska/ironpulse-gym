'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { dashboardPaths } from '@/lib/dashboard';
import { APP_NAME } from '@ironpulse/shared';
import { LanguageSwitch } from '@/components/language-switch';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

export function SiteNavbar(): JSX.Element {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const showMemberLinks = !loading && (!user || user.role === 'MEMBER');
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const isHome = pathname === '/';
  const solid = !isHome || scrolled || open;

  useEffect(() => {
    const update = (): void => setScrolled(window.scrollY > 36);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent): void => {
      const menu = menuRef.current;
      if (event.key === 'Escape') {
        setOpen(false);
        menuToggleRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab' || !menu) return;
      const controls = Array.from(
        menu.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select'),
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    menuRef.current?.querySelector<HTMLElement>('button, a[href], select')?.focus();
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  async function signOut(): Promise<void> {
    await logout();
    setOpen(false);
  }

  function closeMenu(): void {
    setOpen(false);
  }

  return (
    <header className={`site-header ${solid ? 'is-solid' : 'is-transparent'}`}>
      <div className="page-width site-header__inner">
        <Link
          aria-label={APP_NAME}
          className="site-brand display-font"
          href="/"
          onClick={closeMenu}
        >
          {APP_NAME}
          <span>.</span>
        </Link>
        <nav aria-label={t('label')} className="site-nav hidden md:flex">
          <Link className="site-nav-link" href="/#zones">
            {t('services')}
          </Link>
          <Link className="site-nav-link" href="/#trainers">
            {t('team')}
          </Link>
          <Link className="site-nav-link" href="/#membership">
            {t('membership')}
          </Link>
          <Link className="site-nav-link" href={'/blog' as Route}>
            {t('blog')}
          </Link>
          <Link className="site-nav-link" href="/contact">
            {t('contact')}
          </Link>
          {showMemberLinks && (
            <>
              <Link className="site-nav-link" href="/member/machines">
                {t('machines')}
              </Link>
              <Link className="site-nav-link" href="/member/workouts">
                {t('workouts')}
              </Link>
            </>
          )}
          {!loading && user ? (
            <>
              <Link className="site-nav-link" href={dashboardPaths[user.role]}>
                {user.profile?.name ?? user.email}
              </Link>
              <button className="site-login-link" onClick={() => void signOut()} type="button">
                {t('logout')}
              </button>
            </>
          ) : (
            <Link className="site-login-link" href="/login">
              {t('login')}
            </Link>
          )}
        </nav>
        <div className="site-header__actions hidden md:flex">
          <LanguageSwitch id="language-switch-nav" />
          <ThemeToggle />
          {!loading && !user && (
            <Button asChild size="sm">
              <a href="/#trial">{t('freeTrial')}</a>
            </Button>
          )}
        </div>
        <div className="site-header__actions flex md:hidden">
          <ThemeToggle />
          <button
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? t('closeMenu') : t('openMenu')}
            className="site-mobile-toggle"
            onClick={() => setOpen(!open)}
            ref={menuToggleRef}
            type="button"
          >
            {open ? <X aria-hidden="true" size={19} /> : <Menu aria-hidden="true" size={19} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label={t('label')}
          aria-modal="true"
          className="site-mobile-menu flex md:hidden"
          id="mobile-navigation"
          ref={menuRef}
          role="dialog"
        >
          <button
            aria-label={t('closeMenu')}
            className="site-mobile-menu__close"
            onClick={closeMenu}
            type="button"
          >
            <X aria-hidden="true" size={20} />
          </button>
          <Link href="/#zones" onClick={closeMenu}>
            {t('services')}
          </Link>
          <Link href="/#trainers" onClick={closeMenu}>
            {t('team')}
          </Link>
          <Link href="/#membership" onClick={closeMenu}>
            {t('membership')}
          </Link>
          <Link href={'/blog' as Route} onClick={closeMenu}>
            {t('blog')}
          </Link>
          <Link href="/contact" onClick={closeMenu}>
            {t('contact')}
          </Link>
          {showMemberLinks && (
            <>
              <Link href="/member/machines" onClick={closeMenu}>
                {t('machines')}
              </Link>
              <Link href="/member/workouts" onClick={closeMenu}>
                {t('workouts')}
              </Link>
            </>
          )}
          {!loading && user ? (
            <>
              <Link href={dashboardPaths[user.role]} onClick={closeMenu}>
                {user.profile?.name ?? user.email}
              </Link>
              <button className="text-left" onClick={() => void signOut()} type="button">
                {t('logout')}
              </button>
            </>
          ) : (
            <Link href="/login" onClick={closeMenu}>
              {t('login')}
            </Link>
          )}
          <div className="site-mobile-menu__actions">
            <LanguageSwitch id="language-switch-mobile" />
            {!loading && !user && (
              <Button asChild>
                <a href="/#trial" onClick={closeMenu}>
                  {t('freeTrial')}
                </a>
              </Button>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
