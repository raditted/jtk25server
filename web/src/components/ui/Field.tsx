import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/**
 * Labelled form control.
 *
 * Every admin input previously used a floating `<label>` with no `htmlFor` and
 * an input with no `id`, so screen readers announced them all as "edit text,
 * blank". These components generate a matching id, wire `htmlFor`, and connect
 * validation messages via `aria-describedby`.
 */

const CONTROL =
  'w-full min-h-[40px] rounded-lg border px-3 py-2 text-sm ' +
  'border-[var(--border-strong)] bg-[var(--surface-card)] text-primary-token ' +
  'placeholder:text-[color:var(--text-muted)] ' +
  'disabled:cursor-not-allowed disabled:bg-[var(--surface-inset)] disabled:opacity-70';

interface BaseProps {
  label?: string;
  /** Renders a red asterisk after the label. */
  required?: boolean;
  hint?: string;
  error?: string | null;
  /** Renders the label for screen readers only. */
  hideLabel?: boolean;
}

function FieldShell({
  id,
  label,
  required,
  hint,
  error,
  hideLabel,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className={`mb-1.5 block text-sm font-medium text-primary-token ${
            hideLabel ? 'sr-only' : ''
          }`}
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-0.5 text-red-500">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted-token">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string | null) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  label,
  required,
  hint,
  error,
  hideLabel,
  ...rest
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} hideLabel={hideLabel}>
      <input
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} ${error ? 'border-red-500' : ''}`}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  required,
  hint,
  error,
  hideLabel,
  children,
  ...rest
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} hideLabel={hideLabel}>
      <select
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} cursor-pointer ${error ? 'border-red-500' : ''}`}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  required,
  hint,
  error,
  hideLabel,
  ...rest
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} required={required} hint={hint} error={error} hideLabel={hideLabel}>
      <textarea
        id={id}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${CONTROL} min-h-[96px] leading-relaxed ${error ? 'border-red-500' : ''}`}
        {...rest}
      />
    </FieldShell>
  );
}