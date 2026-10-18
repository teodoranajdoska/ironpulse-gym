'use client';

import { ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

export type WorkspaceNotice = { kind: 'success' | 'error'; message: string } | null;

export function useWorkspaceAction(context: string) {
  const t = useTranslations('roleWorkspace');
  const [notice, setNotice] = useState<WorkspaceNotice>(null);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async (action: () => Promise<unknown>, success?: string) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(true);
    try {
      await action();
      setNotice({ kind: 'success', message: success ?? t('saved') });
      return true;
    } catch (error) {
      console.error(
        `${context} workspace request failed.`,
        error instanceof ApiError ? error.status : 'invalid response or network error',
      );
      const messageKey = error instanceof z.ZodError
        ? 'validationError'
        : error instanceof ApiError && error.status === 401
          ? 'sessionExpired'
          : error instanceof ApiError && error.status === 403
            ? 'permissionDenied'
            : error instanceof ApiError && error.status === 404
              ? 'recordNotFound'
              : error instanceof ApiError && error.status === 409
                ? 'conflictError'
                : error instanceof ApiError && error.status === 422
                  ? 'validationError'
                  : 'actionError';
      setNotice({ kind: 'error', message: t(messageKey) });
      return false;
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }, [context, t]);

  return { notice, setNotice, run, pending };
}

export type TableColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

export function ResponsiveTable<T extends { id: string }>({
  label,
  columns,
  rows,
  title,
  emptyTitle,
  emptyDescription,
}: {
  label: string;
  columns: TableColumn<T>[];
  rows: T[];
  title: (row: T) => string;
  emptyTitle: string;
  emptyDescription: string;
}): JSX.Element {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
        <table aria-label={label} className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-raised text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">{label}</th>
              {columns.map((column) => (
                <th className="px-4 py-3 font-semibold" key={column.key} scope="col">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {rows.map((row) => (
              <tr key={row.id}>
                <th className="max-w-[15rem] px-4 py-4 text-left font-medium text-foreground" scope="row">
                  <span className="break-words">{title(row)}</span>
                </th>
                {columns.map((column) => (
                  <td className="px-4 py-4 align-top text-muted" key={column.key}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-label={label} className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article className="rounded-xl border border-line bg-surface p-4" key={row.id}>
            <h3 className="break-words font-semibold text-foreground">{title(row)}</h3>
            <dl className="mt-3 space-y-3">
              {columns.map((column) => (
                <div className="grid min-w-0 gap-1 border-t border-line pt-3" key={column.key}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{column.label}</dt>
                  <dd className="min-w-0 break-words text-sm text-foreground">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}

export function WorkspaceLoading(): JSX.Element {
  const t = useTranslations('roleWorkspace');
  return (
    <div aria-label={t('loading')} aria-live="polite" className="space-y-4">
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-52 w-full rounded-panel" />
      <Skeleton className="h-32 w-full rounded-panel" />
    </div>
  );
}

export function WorkspaceFeedback({
  notice,
  onDismiss,
}: {
  notice: { kind: 'success' | 'error'; message: string } | null;
  onDismiss: () => void;
}): JSX.Element | null {
  const t = useTranslations('roleWorkspace');
  if (!notice) return null;
  return (
    <div
      aria-live={notice.kind === 'error' ? 'assertive' : 'polite'}
      className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 text-sm ${
        notice.kind === 'error'
          ? 'border-red-500/40 bg-red-500/10 text-foreground'
          : 'border-brand-lime/40 bg-brand-lime/10 text-foreground'
      }`}
      role={notice.kind === 'error' ? 'alert' : 'status'}
    >
      <span>{notice.message}</span>
      <Button onClick={onDismiss} size="sm" variant="outline">{t('dismiss')}</Button>
    </div>
  );
}
