import type { ReactNode } from 'react';
import Button from './Button';

export interface Column<T> {
  key: string;
  header: string;
  /** Right-aligned cell, for numbers and action columns. */
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRetry?: () => void;
}

/**
 * Table with real loading, empty and error states.
 *
 * Previously every page rendered an unstyled "Memuat..." string that looked
 * identical to the empty state, and a failed initial load left a bare empty
 * table with no retry. Columns are declared once so header/cell alignment
 * cannot drift between them.
 */
export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyTitle = 'Belum ada data',
  emptyDescription,
  emptyAction,
  onRetry,
}: DataTableProps<T>) {
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.4h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
        </svg>
        <div>
          <p className="font-medium text-primary-token">Gagal memuat data</p>
          <p className="mt-1 text-sm text-muted-token">{error}</p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} size="sm">
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 px-6 py-14" role="status" aria-live="polite">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-hidden="true" />
        <span className="text-sm text-muted-token">Memuat…</span>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
        <svg className="h-10 w-10 text-[color:var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6m16 0v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4m16 0h-4l-2 3h-4l-2-3H4" />
        </svg>
        <p className="font-medium text-primary-token">{emptyTitle}</p>
        {emptyDescription && <p className="max-w-sm text-sm text-muted-token">{emptyDescription}</p>}
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-inset)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-token ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                } ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-[var(--border-subtle)] last:border-0 transition-colors hover:bg-[var(--surface-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-3 align-middle text-primary-token ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.className ?? ''}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}