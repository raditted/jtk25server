import { useEffect, useRef } from 'react';
import Modal from '../Modal';
import Button from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Names the record being acted on, so the user can verify the target. */
  subject?: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Confirmation for destructive actions.
 *
 * The previous dialogs asked "Yakin ingin menghapus ruangan ini?" without
 * naming the record, and their confirm button had no pending state, so a
 * double click issued two DELETEs.
 */
export default function ConfirmDialog({
  open,
  title,
  subject,
  message,
  confirmLabel = 'Hapus',
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
  }, [open]);

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <div ref={confirmRef}>
        <p className="text-sm text-secondary-token">{message}</p>
        {subject && (
          <p className="mt-3 break-words rounded-lg bg-[var(--surface-inset)] px-3 py-2 text-sm font-medium text-primary-token">
            {subject}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onCancel} disabled={loading}>
            Batal
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading} data-autofocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}