import type { Room } from '../../types';
import type { BadgeTone } from '../../components/ui/Badge';
import { PageHeader } from '../../components/AdminLayout';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { SelectField, TextField } from '../../components/ui/Field';
import Modal from '../../components/Modal';
import { useCrud } from '../../components/ui/useCrud';

type RoomForm = { name: string; type: Room['type'] };

const EMPTY: RoomForm = { name: '', type: 'kelas' };

const TYPE_LABELS: Record<Room['type'], string> = {
  kelas: 'Ruang Kelas',
  lab: 'Laboratorium',
  online: 'Online',
};

const TYPE_TONES: Record<Room['type'], BadgeTone> = {
  kelas: 'success',
  lab: 'primary',
  online: 'info',
};

export default function AdminRuangan() {
  const crud = useCrud<Room, RoomForm>({
    listPath: '/admin/rooms',
    createPath: '/admin/rooms',
    updatePath: (row) => `/admin/rooms/${row.id}`,
    deletePath: (row) => `/admin/rooms/${row.id}`,
    emptyForm: EMPTY,
    toForm: (row) => ({ name: row.name, type: row.type }),
    toCreateBody: (form) => ({ name: form.name.trim(), type: form.type }),
    toUpdateBody: (form) => ({ name: form.name.trim(), type: form.type }),
    validate: (form) => ({
      name: form.name.trim() ? null : 'Nama ruangan wajib diisi',
    }),
    describe: (row) => row.name,
    noun: 'ruangan',
  });

  const columns: Column<Room>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (row) => (
        <div>
          <p className="font-medium">{row.name}</p>
          <p className="mt-0.5 text-xs text-muted-token">{row.ext_id}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipe',
      render: (row) => <Badge tone={TYPE_TONES[row.type]}>{TYPE_LABELS[row.type]}</Badge>,
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

  const onlineCount = crud.rows.filter((r) => r.type === 'online').length;
  const physicalCount = crud.rows.length - onlineCount;

  return (
    <>
      <PageHeader
        title="Kelola Ruangan"
        description={`${physicalCount} ruangan fisik${onlineCount > 0 ? ` · ${onlineCount} ruang online` : ''}. Ruangan online tidak dipakai untuk occupy maupun ketersediaan.`}
        actions={
          <Button variant="primary" onClick={crud.openAdd} icon={<PlusIcon />}>
            Tambah Ruangan
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
          emptyTitle="Belum ada ruangan"
          emptyDescription="Tambahkan ruangan fisik atau ruang online untuk sesi jarak jauh."
          emptyAction={
            <Button variant="primary" onClick={crud.openAdd}>
              Tambah Ruangan
            </Button>
          }
        />
      </div>

      <Modal
        open={crud.modalOpen}
        onClose={crud.closeModal}
        title={crud.editing ? 'Edit Ruangan' : 'Tambah Ruangan'}
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
            label="Nama"
            required
            hideLabel={false}
            value={crud.form.name}
            onChange={(e) => crud.setField('name', e.target.value)}
            error={crud.fieldErrors.name}
            placeholder="D108 Kelas"
          />

          <SelectField
            label="Tipe"
            required
            value={crud.form.type}
            onChange={(e) => crud.setField('type', e.target.value as Room['type'])}
            hint="Pilih Online untuk sesi jarak jauh yang tidak memakai ruangan fisik."
          >
            <option value="kelas">Ruang Kelas</option>
            <option value="lab">Laboratorium</option>
            <option value="online">Online</option>
          </SelectField>

          {crud.saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {crud.saveError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={crud.deleting !== null}
        title="Hapus Ruangan"
        subject={crud.deleting?.name}
        message="Ruangan akan dihapus dari daftar. Jadwal yang sudah memakai ruangan ini tidak ikut terhapus, tetapi ruang tersebut tidak lagi bisa dipilih."
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