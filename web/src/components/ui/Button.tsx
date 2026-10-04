import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Button with a consistent, comfortably-sized hit target.
 *
 * The old admin pages used bare `text-xs` links for row actions (~16px tall).
 * Every variant here is at least 36px tall so actions are clickable and
 * readable at any density.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  /** Stretch to the container width (primary form actions). */
  block?: boolean;
  loading?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 dark:disabled:bg-primary-900',
  secondary:
    'border border-[var(--border-strong)] bg-[var(--surface-card)] text-primary-token hover:bg-[var(--surface-hover)] active:bg-[var(--surface-inset)]',
  ghost:
    'text-secondary-token hover:bg-[var(--surface-inset)] hover:text-primary-token',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300 dark:disabled:bg-red-900',
};

const SIZES: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 text-sm gap-1.5',
  md: 'min-h-[40px] px-4 text-sm gap-2',
};

export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  block = false,
  loading = false,
  disabled,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-lg font-medium',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        block ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
      {children}
    </button>
  );
}

/** Small square icon-only button; keeps a 36px target and an accessible name. */
export function IconButton({
  label,
  icon,
  variant = 'ghost',
  ...rest
}: Omit<ButtonProps, 'children' | 'icon'> & { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={rest.disabled || rest.loading}
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        rest.className ?? '',
      ].join(' ')}
      {...rest}
    >
      {rest.loading ? (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        icon
      )}
    </button>
  );
}