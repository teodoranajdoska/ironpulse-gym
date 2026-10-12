'use client';

import {
  authMeResponseSchema,
  authUserSchema,
  type AuthUser,
} from '@ironpulse/shared';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost, loadCurrentUser } from './api-client';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  reload: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const reload = useCallback(async () => {
    const result = await loadCurrentUser();
    const nextUser = result ? authUserSchema.parse(result.user) : null;
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    let active = true;
    loadCurrentUser()
      .then((result) => {
        if (active) setUser(result ? authMeResponseSchema.parse(result).user : null);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    await apiPost('/auth/logout', {});
    setUser(null);
    router.replace('/login');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, reload, logout, setUser }),
    [user, loading, reload, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
