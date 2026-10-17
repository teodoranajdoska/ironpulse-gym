'use client';

import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }): JSX.Element {
  const pathname = usePathname();
  return <div className="page-enter" id="main-content" key={pathname}>{children}</div>;
}
