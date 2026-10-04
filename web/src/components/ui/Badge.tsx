import type { ReactNode } from 'react';

/**
 * Small status pill.
 *
 * Replaces five inline copies of `px-2 py-0.5 rounded-full text-xs` with
 * ad-hoc colours, plus one `text-[10px]` outlier. All badges now share a size
 * and a colour vocabulary.
 */

export type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'online';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  primary: 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  online: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
};

export default function Badge({
  tone = 'neutral',
  icon,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}

/** Delivery-mode pill for a schedule session. */
export function ModeBadge({ mode }: { mode?: string | null }) {
  if (mode !== 'online') return <span className="text-xs text-muted-token">Offline</span>;
  return (
    <Badge tone="online" icon={<WifiIcon />}>
      Online
    </Badge>
  );
}

function WifiIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm0-5.6a5.4 5.4 0 0 0-3.8 1.6l1.6 1.6a3.4 3.4 0 0 1 4.4 0l1.6-1.6a5.4 5.4 0 0 0-3.8-1.6Zm0-5.4a10.8 10.8 0 0 0-7.6 3.1l1.6 1.6a8.8 8.8 0 0 1 12 0l1.6-1.6A10.8 10.8 0 0 0 12 7.5Z" />
    </svg>
  );
}