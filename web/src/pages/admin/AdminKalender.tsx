import { useState } from 'react';
import type { CalendarEvent } from '../../types';
import { CLASS_LIST } from '../../types';
import { apiClient } from '../../api';
import { PageHeader } from '../../components/AdminLayout';
import NotifyPrompt from '../../components/NotifyPrompt';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Modal from '../../components/Modal';
import { showToast } from '../../components/Toast';
import { useCrud } from '../../components/ui/useCrud';
import { useAuth } from '../../contexts/AuthContext';

type Form = {
  title: string;
  description: string;
  date: string;
  end_date: string;
  location: string;
  category: string;
  class_name: string;
  collection_time: string;
};

const EMPTY: Form = {
  title: '',
  description: '',
  date: '',
  end_date: '',
  location: '',
  category: '',
  class_name: '',
  collection_time: '',
};

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function formatDateID(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(day) || isNaN(month) || month < 1 || month > 12) return dateStr;
  return `${day} ${MONTHS_ID[month - 1]} ${parts[0]}`;
}

export default function AdminKalender() {
  const { scope, isGlobal } = useAuth();
  const [showArchived, setShowArchived] = useState(false);
  const [notifyClass, setNotifyClass] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<CalendarEvent | null>(null);
  const [archivePending, setArchivePending] = useState(false);

  const crud = useCrud<CalendarEvent, Form>({
    listPath: '/admin/events',
    createPath: '/admin/events',
    updatePath: (row) => `/admin/events/${row.id}`,
    deletePath: (row) => `/admin/events/${row.id}`,
    emptyForm: EMPTY,
    toForm: (row) => ({
      title: row.title,
      description: row.description ?? '',
      date: row.date,
      end_date: row.end_date,
      location: row.location ?? '',
      category: row.category ?? '',
      class_name: row.class_name ?? '',
      collection_time: row.collection_time ?? '',
    }),
    toCreateBody: (form) => form,
    toUpdateBody: (form) => form,
    validate: (form) => ({
      title: form.title.trim() ? null : 'Judul wajib diisi',
      date: form.date ? null : 'Tanggal mulai wajib diisi',
      end_date: form.end_date ? null : 'Tanggal akhir wajib diisi',
    }),
    describe: (row) => row.title,
    noun: 'tugas',
  });

  async function handleSave() {
    // Class-scoped admins are pinned to their own class.
    const ok = await crud.save();
    if (ok) setNotifyClass(crud.editing?.class_name ?? crud.form.class_name);
  }

  async function confirmArchive() {
    if (!archiving) return;
    const wasArchived = archiving.is_archived === 1;
    setArchivePending(true);
    try {
      await apiClient.post(`/admin/events/${archiving.id}/archive`, { archived: !wasArchived });
      showToast(wasArchived ? 'Tugas dipulihkan' : 'Tugas diarsipkan', 'success');
      setArchiving(null);
      await crud.reload();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah status arsip', 'error');
    } finally {
      setArchivePending(false);
    }
  }

  const rows = crud.rows.filter((e) => (showArchived ? e.is_archived === 1 : e.is_archived === 0));

  const columns: Column<CalendarEvent>[] = [
    {
      key: 'title',
      header: 'Judul',
      render: (row) => (
        <div className="min-w-[200px]">
          <p className="font-medium">{row.title}</p>
          {row.collection_time && (
            <p className="mt-0.5 text-xs text-muted-token">Dikumpulkan {row.collection_time}</p>
          )}
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Tanggal',
      render: (row) => (
        <span className="whitespace-nowrap text-secondary-token">
          {formatDateID(row.date)}
          {row.end_date && row.end_date !== row.date ? ` – ${formatDateID(row.end_date)}` : ''}
        </span>
      ),
    },
    {
      key: 'class',
      header: 'Kelas',
      render: (row) =>
        row.class_name ? (
          <Badge tone="primary">{row.class_name.replace(/_/g, '-')}</Badge>
        ) : (
          <span className="text-muted-token">Semua</span>
        ),
    },
    {
      key: 'location',
      header: 'Lokasi',
      render: (row) => <span className="text-secondary-token">{row.location || '—'}</span>,
    },
    {
      key: 'category',
      header: 'Kategori',
      render: (row) => (row.category ? <Badge tone="neutral">{row.category}</Badge> : <span className="text-muted-token">—</span>),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => crud.openEdit(row)}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setArchiving(row)}
          >
            <span className={row.is_archived === 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
              {row.is_archived === 0 ? 'Arsipkan' : 'Pulihkan'}
            </span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => crud.setDeleting(row)}>
            <span className="text-red-600 dark:text-red-400">Hapus</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Kelola Tugas"
        description="Kegiatan dan tugas yang tampil di kalender aplikasi."
        actions={
          <>
            <Button
              variant={showArchived ? 'primary' : 'secondary'}
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? 'Tampilkan Aktif' : 'Tampilkan Arsip'}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                crud.openAdd();
                if (!isGlobal) crud.setField('class_name', scope?.replace('class:', '') ?? '');
              }}
              icon={<PlusIcon />}
            >
              Tambah Tugas
            </Button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={crud.loading}
          error={crud.loadError}
          onRetry={crud.reload}
          emptyTitle={showArchived ? 'Arsip kosong' : 'Belum ada tugas'}
          emptyDescription={
            showArchived
              ? 'Tidak ada tugas yang diarsipkan.'
              : 'Tambahkan tugas atau kegiatan pertama.'
          }
        />
      </div>

      <Modal
        open={crud.modalOpen}
        onClose={crud.closeModal}
        title={crud.editing ? 'Edit Tugas' : 'Tambah Tugas'}
        size="lg"
        footer={
          <>
            <Button onClick={crud.closeModal} disabled={crud.saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={crud.saving}>
              Simpan
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <TextField
            label="Judul"
            required
            value={crud.form.title}
            onChange={(e) => crud.setField('title', e.target.value)}
            error={crud.fieldErrors.title}
          />

          <TextAreaField
            label="Deskripsi (Markdown)"
            value={crud.form.description}
            onChange={(e) => crud.setField('description', e.target.value)}
            rows={5}
            className="font-mono"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              label="Tanggal Mulai"
              type="date"
              required
              value={crud.form.date}
              onChange={(e) => crud.setField('date', e.target.value)}
              error={crud.fieldErrors.date}
            />
            <TextField
              label="Tanggal Akhir"
              type="date"
              required
              value={crud.form.end_date}
              onChange={(e) => crud.setField('end_date', e.target.value)}
              error={crud.fieldErrors.end_date}
            />
            <TextField
              label="Jam Pengumpulan"
              type="time"
              value={crud.form.collection_time}
              onChange={(e) => crud.setField('collection_time', e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Lokasi Pengumpulan"
              value={crud.form.location}
              onChange={(e) => crud.setField('location', e.target.value)}
            />
            <TextField
              label="Kategori"
              value={crud.form.category}
              onChange={(e) => crud.setField('category', e.target.value)}
            />
          </div>

          {isGlobal && (
            <SelectField
              label="Kelas"
              value={crud.form.class_name}
              onChange={(e) => crud.setField('class_name', e.target.value)}
              hint="Kosongkan agar tampil untuk semua kelas."
            >
              <option value="">Semua / Global</option>
              {CLASS_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          )}

          {crud.saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {crud.saveError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={crud.deleting !== null}
        title="Hapus Tugas"
        subject={crud.deleting?.title}
        message="Tugas akan dihapus permanen dari kalender."
        onConfirm={crud.confirmDelete}
        onCancel={() => crud.setDeleting(null)}
        loading={crud.deletePending}
      />

      {/* Archiving previously fired immediately with no confirmation. */}
      <ConfirmDialog
        open={archiving !== null}
        title={archiving?.is_archived === 1 ? 'Pulihkan Tugas' : 'Arsipkan Tugas'}
        subject={archiving?.title}
        message={
          archiving?.is_archived === 1
            ? 'Tugas akan kembali tampil di kalender aktif.'
            : 'Tugas akan dipindahkan ke arsip dan tidak lagi tampil di kalender aktif.'
        }
        confirmLabel={archiving?.is_archived === 1 ? 'Pulihkan' : 'Arsipkan'}
        onConfirm={confirmArchive}
        onCancel={() => setArchiving(null)}
        loading={archivePending}
      />

      <NotifyPrompt
        open={notifyClass !== null}
        onClose={() => setNotifyClass(null)}
        defaultClass={notifyClass ?? ''}
        type="kalender"
      />
    </>
  );
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}