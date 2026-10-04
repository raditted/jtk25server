import Markdown from 'react-markdown';
import { TextAreaField } from './Field';

interface MarkdownEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  maxLength?: number;
  rows?: number;
}

/**
 * Markdown textarea with a live preview.
 *
 * The preview previously used `prose prose-sm` with no typography plugin
 * installed, so it rendered as unstyled inline text. The plugin is now a dev
 * dependency, and the counter turns red past the limit.
 */
export default function MarkdownEditor({
  label,
  value,
  onChange,
  error,
  maxLength,
  rows = 8,
}: MarkdownEditorProps) {
  const over = maxLength !== undefined && value.length > maxLength;

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextAreaField
          label={label}
          required
          hideLabel
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          error={error}
          className="font-mono"
          placeholder="**Bold**, *italic*, - list items…"
        />

        <div className="flex flex-col">
          <span className="mb-1.5 text-sm font-medium text-primary-token">
            Preview
          </span>
          <div className="min-h-[96px] flex-1 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-3">
            {value ? (
              <div className="prose prose-sm max-w-none text-primary-token dark:prose-invert">
                <Markdown>{value}</Markdown>
              </div>
            ) : (
              <p className="text-sm italic text-muted-token">Tidak ada konten</p>
            )}
          </div>
        </div>
      </div>

      {maxLength !== undefined && (
        <p
          className={`mt-1.5 text-right text-xs ${over ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted-token'}`}
        >
          {value.length} / {maxLength}
        </p>
      )}
    </div>
  );
}