import type { Announcement } from '../../types';
import { CLASS_LIST } from '../../types';
import { PageHeader } from '../../components/AdminLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/Field';
import MarkdownEditor from '../../components/ui/MarkdownEditor';
import Modal from '../../components/Modal';
import { useCrud } from '../../components/ui/useCrud';

const BODY_MAX = 2000;

type Form = {
  title: string;
  body: string;
  pinned: number;
  class_name: string;
  expires_at: string;
};

const EMPTY: Form = { title: '', body: '', pinned: 0, class_name: '', expires_at: '' };

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const cleaned = iso.replace(/Z$/i, '');
  return cleaned.length >= 16 ? cleaned.slice(0, 16) : cleaned;
}

function toIsoDatetime(val: string): string | null {
  if (!val) return null;
  return val.length === 16 ? `${val}:00` : val;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID');
}

export default function AdminPengumuman() {
  const crud = useCrud<Announcement, Form>({
    listPath: '/admin/announcements',
    createPath: '/admin/announcements',
    updatePath: (row) => `/admin/announcements/${row.id}`,
    deletePath: (row) => `/admin/announcements/${row.id}`,
    emptyForm: EMPTY,
    toForm: (row) => ({
      title: row.title,
      body: row.body,
      pinned: row.pinned,
      class_name: row.class_name ?? '',
      expires_at: toDatetimeLocal(row.expires_at),
    }),
    toCreateBody: (form) => ({
      title: form.title.trim(),
      body: form.body,
      pinned: form.pinned,
      class_name: form.class_name || null,
      expires_at: toIsoDatetime(form.expires_at),
    }),
    toUpdateBody: (form) => ({
      title: form.title.trim(),
      body: form.body,
      pinned: form.pinned,
      class_name: form.class_name || null,
      expires_at: toIsoDatetime(form.expires_at),
    }),
    validate: (form) => ({
      title: form.title.trim() ? null : 'Judul wajib diisi',
      body: form.body.trim() ? null : 'Isi pengumuman wajib diisi',
    }),
    describe: (row) => row.title,
    noun: 'pengumuman',
  });

  const columns: Column<Announcement>[] = [
    {
      key: 'title',
      header: 'Judul',
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="font-medium">{row.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-token" title={row.body}>
            {row.body}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) =>
        row.pinned ? <Badge tone="warning">Pinned</Badge> : <Badge tone="neutral">Normal</Badge>,
    },
    {
      key: 'class',
      header: 'Kelas',
      render: (row) =>
        row.class_name ? <Badge tone="primary">{row.class_name}</Badge> : <span className="text-muted-token">Semua</span>,
    },
    {
      key: 'expires',
      header: 'Berlaku hingga',
      render: (row) => (
        <span className="whitespace-nowrap text-muted-token">{formatDate(row.expires_at)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => crud.openEdit(row)}>
            Edit
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
        title="Kelola Pengumuman"
        description="Informasi yang tampil di halaman pengumuman aplikasi."
        actions={
          <Button variant="primary" onClick={crud.openAdd} icon={<PlusIcon />}>
            Tambah Pengumuman
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          rows={crud.rows}
          rowKey={(row) => row.id}
          loading={crud.loading}
          error={crud.loadError}
          onRetry={crud.reload}
          emptyTitle="Belum ada pengumuman"
          emptyDescription="Buat pengumuman pertama untuk mahasiswa."
          emptyAction={
            <Button variant="primary" onClick={crud.openAdd}>
              Tambah Pengumuman
            </Button>
          }
        />
      </div>

      <Modal
        open={crud.modalOpen}
        onClose={crud.closeModal}
        title={crud.editing ? 'Edit Pengumuman' : 'Tambah Pengumuman'}
        size="xl"
        footer={
          <>
            <Button onClick={crud.closeModal} disabled={crud.saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={crud.save} loading={crud.saving}>
              Simpan
            </Button>
          </>
        }
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void crud.save();
          }}
        >
          <TextField
            label="Judul"
            required
            value={crud.form.title}
            onChange={(e) => crud.setField('title', e.target.value)}
            error={crud.fieldErrors.title}
          />

          <MarkdownEditor
            label="Isi (Markdown)"
            value={crud.form.body}
            onChange={(v) => crud.setField('body', v)}
            error={crud.fieldErrors.body}
            maxLength={BODY_MAX}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Pinned"
              value={String(crud.form.pinned)}
              onChange={(e) => crud.setField('pinned', Number(e.target.value))}
            >
              <option value="0">Tidak</option>
              <option value="1">Ya</option>
            </SelectField>

            <TextField
              label="Berlaku hingga"
              type="datetime-local"
              value={crud.form.expires_at}
              onChange={(e) => crud.setField('expires_at', e.target.value)}
            />

            <SelectField
              label="Kelas"
              value={crud.form.class_name}
              onChange={(e) => crud.setField('class_name', e.target.value)}
            >
              <option value="">Semua / Global</option>
              {CLASS_LIST.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
          </div>

          {crud.saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {crud.saveError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={crud.deleting !== null}
        title="Hapus Pengumuman"
        subject={crud.deleting?.title}
        message="Pengumuman akan dihapus permanen dan tidak lagi tampil di aplikasi."
        onConfirm={crud.confirmDelete}
        onCancel={() => crud.setDeleting(null)}
        loading={crud.deletePending}
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