import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../../api';
import { showToast } from '../Toast';

/**
 * Shared CRUD state machine for the admin list pages.
 *
 * Five pages each declared the same eight `useState` calls and the same
 * load/openAdd/openEdit/save/delete sequence. This keeps the behaviour
 * identical while giving every page loading, error and saving states for free.
 */
export interface CrudOptions<T, F> {
  /** GET path, e.g. `/admin/rooms`. */
  listPath: string;
  /** POST path for create. */
  createPath: string;
  /** Builds the PUT path for update, or null when updates aren't supported. */
  updatePath?: (row: T) => string | null;
  /** DELETE path for remove. */
  deletePath?: (row: T) => string | null;
  /** The blank form used by "add". */
  emptyForm: F;
  /** Returns the form state when editing an existing row. */
  toForm: (row: T) => F;
  /** POST body. */
  toCreateBody: (form: F) => unknown;
  /** PUT body. */
  toUpdateBody: (form: F) => unknown;
  /** Returns field-level errors, or null when valid. */
  validate?: (form: F) => Record<string, string | null> | null;
  /** Human-readable label for confirmations and toasts. */
  describe: (row: T) => string;
  /** Entity name used in toast messages, e.g. "ruangan". */
  noun: string;
  /** Merge the list response, for endpoints that wrap rows. */
  select?: (payload: unknown) => T[];
}

export function useCrud<T extends { id?: number }, F extends object>(
  options: CrudOptions<T, F>,
) {
  const {
    listPath,
    createPath,
    updatePath,
    deletePath,
    emptyForm,
    toForm,
    toCreateBody,
    toUpdateBody,
    validate,
    describe,
    noun,
    select,
  } = options;

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<F>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const [deleting, setDeleting] = useState<T | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const payload = await apiClient.get<unknown>(listPath);
      setRows(select ? select(payload) : ((payload as T[]) ?? []));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPath, select]);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFieldErrors({});
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    setForm(toForm(row));
    setFieldErrors({});
    setSaveError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setSaveError(null);
    setFieldErrors({});
  }

  function setField<K extends keyof F>(key: K, value: F[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key as string]: null }));
  }

  async function save(): Promise<boolean> {
    const errors = validate?.(form);
    if (errors) {
      setFieldErrors(errors);
      showToast('Periksa kembali kolom yang ditandai', 'error');
      return false;
    }

    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        const path = updatePath?.(editing);
        if (!path) throw new Error('Pembaruan tidak didukung untuk data ini');
        await apiClient.put(path, toUpdateBody(form));
        showToast(`${cap(noun)} berhasil diperbarui`, 'success');
      } else {
        await apiClient.post(createPath, toCreateBody(form));
        showToast(`${cap(noun)} berhasil ditambahkan`, 'success');
      }
      setModalOpen(false);
      setEditing(null);
      await load();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setSaveError(message);
      showToast(message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(): Promise<boolean> {
    if (!deleting) return false;
    const path = deletePath?.(deleting);
    if (!path) {
      setDeleting(null);
      return false;
    }

    setDeletePending(true);
    try {
      await apiClient.delete(path);
      showToast(`${cap(noun)} berhasil dihapus`, 'success');
      setDeleting(null);
      await load();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Terjadi kesalahan', 'error');
      return false;
    } finally {
      setDeletePending(false);
    }
  }

  return {
    rows,
    loading,
    loadError,
    reload: load,

    modalOpen,
    editing,
    form,
    setField,
    fieldErrors,
    saveError,
    saving,
    openAdd,
    openEdit,
    closeModal,
    save,

    deleting,
    setDeleting,
    deletePending,
    confirmDelete,
    describe,
  };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}