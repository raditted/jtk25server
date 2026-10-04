import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient, isGlobalAdmin } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { Pengganti, PenggantiSession, SchedulesResponse, Room } from '../../types';
import { CLASS_LIST } from '../../types';
import { PageHeader } from '../../components/AdminLayout';
import NotifyPrompt from '../../components/NotifyPrompt';
import Badge from '../../components/ui/Badge';
import Button, { IconButton } from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import Modal from '../../components/Modal';
import { showToast } from '../../components/Toast';

/* ── Session row ──────────────────────────────────────────────────────────── */

interface SessionRow {
  key: string;
  time: string;
  course_name: string;
  course_code: string;
  type: 'TE' | 'PR';
  lecturer: string;
  lecturer_code: string;
  room: string;
  mode: 'offline' | 'online';
}

const CANONICAL_TIMES = [
  '07.00-07.50', '07.50-08.40', '08.40-09.30', '09.30-10.40',
  '10.40-11.30', '11.30-12.20', '13.00-13.50', '13.50-14.40',
  '14.40-15.20', '15.40-16.30', '16.30-17.20',
];

let rowSeq = 0;
const makeRow = (): SessionRow => ({
  key: `sr-${++rowSeq}`,
  time: '',
  course_name: '',
  course_code: '',
  type: 'TE',
  lecturer: '',
  lecturer_code: '',
  room: '',
  mode: 'offline',
});

type Kind = Pengganti['kind'];

interface FormState {
  class_code: string;
  date: string;
  kind: Kind;
  note: string;
  sessions: SessionRow[];
}

const EMPTY_FORM: FormState = {
  class_code: '',
  date: '',
  kind: 'replace',
  note: '',
  sessions: [],
};

const KIND_LABELS: Record<Kind, string> = {
  replace: 'Ganti Jadwal',
  add: 'Tambah Jadwal',
  info: 'Info',
};

function isOnlineRoom(room: string): boolean {
  return room.startsWith('Online-');
}

/** Serialize rows to the JSON the API stores. */
function sessionsToJSON(rows: SessionRow[]): PenggantiSession[] {
  return rows.map((s) => ({
    time: s.time,
    course_code: s.course_code,
    course_name: s.course_name,
    type: s.type,
    lecturer_code: s.lecturer_code,
    lecturer: s.lecturer,
    room: s.room,
    mode: s.mode,
  }));
}

function validateRow(row: SessionRow): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!row.time.trim()) errors.time = 'Waktu wajib diisi';
  if (!row.course_name.trim()) errors.course_name = 'Nama mata kuliah wajib diisi';
  if (!row.course_code.trim()) errors.course_code = 'Kode mata kuliah wajib diisi';
  if (!row.lecturer.trim()) errors.lecturer = 'Dosen wajib diisi';
  if (!row.lecturer_code.trim()) errors.lecturer_code = 'Kode dosen wajib diisi';
  if (!row.room.trim()) errors.room = 'Ruang wajib diisi';
  return errors;
}

/* ── Session editor ───────────────────────────────────────────────────────── */

interface SessionEditorProps {
  row: SessionRow;
  index: number;
  errors: Record<string, string>;
  rooms: Room[];
  courseByName: Map<string, string>;
  lecturerByName: Map<string, string>;
  onChange: (field: keyof SessionRow, value: string) => void;
  onRemove: () => void;
}

function SessionEditor({
  row, index, errors, rooms, courseByName, lecturerByName, onChange, onRemove,
}: SessionEditorProps) {
  const onlineRooms = rooms.filter((r) => r.type === 'online');
  const physicalRooms = rooms.filter((r) => r.type !== 'online');

  // Course/lecturer codes fill in automatically when a known name is picked.
  function changeCourse(name: string) {
    onChange('course_name', name);
    const code = courseByName.get(name);
    if (code) onChange('course_code', code);
  }

  function changeLecturer(name: string) {
    onChange('lecturer', name);
    const code = lecturerByName.get(name);
    if (code) onChange('lecturer_code', code);
  }

  function changeRoom(room: string) {
    onChange('room', room);
    onChange('mode', isOnlineRoom(room) ? 'online' : 'offline');
  }

  return (
    <fieldset className="panel-inset">
      <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-token">
        Sesi {index + 1}
      </legend>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
          <TextField
            label="Mata Kuliah"
            required
            value={row.course_name}
            onChange={(e) => changeCourse(e.target.value)}
            error={errors.course_name}
            list={`pg-course-${row.key}`}
            placeholder="Sistem Basis Data"
          />
          <datalist id={`pg-course-${row.key}`}>
            {Array.from(courseByName.entries()).map(([name, code]) => (
              <option key={name} value={name}>{`${code} — ${name}`}</option>
            ))}
          </datalist>

          <SelectField
            label="Tipe"
            required
            value={row.type}
            onChange={(e) => onChange('type', e.target.value)}
            error={errors.type}
          >
            <option value="TE">Teori</option>
            <option value="PR">Praktik</option>
          </SelectField>
        </div>

        <TextField
          label="Kode Mata Kuliah"
          required
          value={row.course_code}
          onChange={(e) => onChange('course_code', e.target.value)}
          error={errors.course_code}
          placeholder="25TI2104"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Waktu"
            required
            value={row.time}
            onChange={(e) => onChange('time', e.target.value)}
            error={errors.time}
            list={`pg-time-${row.key}`}
            placeholder="07.00-07.50"
          />
          <datalist id={`pg-time-${row.key}`}>
            {CANONICAL_TIMES.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          {/* Room ids are what schedules store, so select on ext_id. */}
          <SelectField
            label="Ruang"
            required
            value={row.room}
            onChange={(e) => changeRoom(e.target.value)}
            error={errors.room}
            hint="Ruang online menandai sesi ini sebagai online."
          >
            <option value="">— Pilih ruangan —</option>
            {onlineRooms.length > 0 && (
              <optgroup label="Online">
                {onlineRooms.map((r) => (
                  <option key={r.ext_id} value={r.ext_id}>{r.name}</option>
                ))}
              </optgroup>
            )}
            <optgroup label="Ruangan fisik">
              {physicalRooms.map((r) => (
                <option key={r.ext_id} value={r.ext_id}>{r.name}</option>
              ))}
            </optgroup>
          </SelectField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Dosen"
            required
            value={row.lecturer}
            onChange={(e) => changeLecturer(e.target.value)}
            error={errors.lecturer}
            list={`pg-dosen-${row.key}`}
            placeholder="Trisna Gelar, S.T., M.Kom."
          />
          <datalist id={`pg-dosen-${row.key}`}>
            {Array.from(lecturerByName.entries()).map(([name, code]) => (
              <option key={name} value={name}>{`${code} — ${name}`}</option>
            ))}
          </datalist>

          <TextField
            label="Kode Dosen"
            required
            value={row.lecturer_code}
            onChange={(e) => onChange('lecturer_code', e.target.value)}
            error={errors.lecturer_code}
            placeholder="TG"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-token">
            {row.mode === 'online' ? 'Sesi online' : 'Sesi offline'}
          </span>
          <IconButton label={`Hapus sesi ${index + 1}`} icon={<CloseIcon />} onClick={onRemove} />
        </div>
      </div>
    </fieldset>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

export default function AdminPengganti() {
  const { scope } = useAuth();
  const isGlobal = isGlobalAdmin();
  const myClass = !isGlobal ? scope?.replace('class:', '') : null;

  const [rows, setRows] = useState<Pengganti[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Pengganti | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, Record<string, string>>>({});
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [deleting, setDeleting] = useState<Pengganti | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notifyClass, setNotifyClass] = useState<string | null>(null);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [courseByName, setCourseByName] = useState<Map<string, string>>(new Map());
  const [lecturerByName, setLecturerByName] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRows(await apiClient.get<Pengganti[]>('/admin/pengganti'));
    } catch {
      setLoadError('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        const [schedulesRes, roomsRes] = await Promise.all([
          apiClient.get<SchedulesResponse>('/schedules'),
          apiClient.get<Room[]>('/rooms'),
        ]);
        const cMap = new Map<string, string>();
        const lMap = new Map<string, string>();
        for (const cls of schedulesRes.classes) {
          for (const day of cls.schedule) {
            for (const s of day.sessions) {
              if (s.course_name && s.course_code && !cMap.has(s.course_name)) {
                cMap.set(s.course_name, s.course_code);
              }
              if (s.lecturer && s.lecturer_code && !lMap.has(s.lecturer)) {
                lMap.set(s.lecturer, s.lecturer_code);
              }
            }
          }
        }
        setCourseByName(cMap);
        setLecturerByName(lMap);
        setRooms(roomsRes);
      } catch {
        // Suggestions are optional; the fields stay editable as free text.
      }
    }
    void fetchOptions();
  }, []);

  const classList = useMemo(() => {
    const available = new Set(rows.map((r) => r.class_code));
    const list = CLASS_LIST.filter((c) => available.has(c));
    return list.length > 0 ? list : Array.from(available);
  }, [rows]);

  function openAdd() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, class_code: myClass || '' });
    setRowErrors({});
    setSessionError(null);
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(p: Pengganti) {
    setEditing(p);
    setRowErrors({});
    setSessionError(null);
    setSaveError(null);
    setForm({
      class_code: p.class_code,
      date: p.date,
      kind: p.kind,
      note: p.note ?? '',
      sessions: Array.isArray(p.sessions)
        ? p.sessions.map((s) => ({
            ...makeRow(),
            time: typeof s.time === 'string' ? s.time : '',
            course_name: typeof s.course_name === 'string' ? s.course_name : '',
            course_code: typeof s.course_code === 'string' ? s.course_code : '',
            type: s.type === 'PR' ? 'PR' : 'TE',
            lecturer: typeof s.lecturer === 'string' ? s.lecturer : '',
            lecturer_code: typeof s.lecturer_code === 'string' ? s.lecturer_code : '',
            room: typeof s.room === 'string' ? s.room : '',
            mode: s.mode === 'online' ? 'online' : 'offline',
          }))
        : [],
    });
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
  }

  function addSession() {
    setForm((prev) => ({ ...prev, sessions: [...prev.sessions, makeRow()] }));
  }

  function removeSession(key: string) {
    setForm((prev) => ({ ...prev, sessions: prev.sessions.filter((s) => s.key !== key) }));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateRow(key: string, field: keyof SessionRow, value: string) {
    setForm((prev) => ({
      ...prev,
      sessions: prev.sessions.map((s) => (s.key === key ? { ...s, [field]: value } : s)),
    }));
    setRowErrors((prev) => {
      const row = prev[key];
      if (!row) return prev;
      const nextRow = { ...row };
      delete nextRow[field];
      if (Object.keys(nextRow).length === 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: nextRow };
    });
  }

  function validateSessions(): boolean {
    if (form.sessions.length === 0) {
      setSessionError('Minimal satu sesi diperlukan.');
      return false;
    }
    const errors: Record<string, Record<string, string>> = {};
    for (const row of form.sessions) {
      const errs = validateRow(row);
      if (Object.keys(errs).length > 0) errors[row.key] = errs;
    }
    setRowErrors(errors);
    setSessionError(
      Object.keys(errors).length > 0 ? 'Perbaiki sesi yang ditandai.' : null,
    );
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!form.class_code) {
      setSaveError('Kelas wajib dipilih.');
      return;
    }
    if (!form.date) {
      setSaveError('Tanggal wajib diisi.');
      return;
    }
    if (form.kind !== 'info' && !validateSessions()) return;

    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        class_code: form.class_code,
        date: form.date,
        kind: form.kind,
        note: form.note.trim() || null,
        sessions: form.kind === 'info' ? [] : sessionsToJSON(form.sessions),
      };
      if (editing) {
        await apiClient.put(`/admin/pengganti/${editing.id}`, payload);
      } else {
        await apiClient.post('/admin/pengganti', payload);
      }
      showToast(
        editing ? 'Jadwal pengganti diperbarui' : 'Jadwal pengganti ditambahkan',
        'success',
      );
      setModalOpen(false);
      await load();
      setNotifyClass(form.class_code);
    } catch (e) {
      const msg =
        e instanceof Error && 'body' in e
          ? (e as { body?: { error?: string } }).body?.error ?? 'Gagal menyimpan'
          : 'Gagal menyimpan';
      setSaveError(msg);
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiClient.delete(`/admin/pengganti/${deleting.id}`);
      showToast('Jadwal pengganti dihapus', 'success');
      setNotifyClass(deleting.class_code);
      setDeleting(null);
      await load();
    } catch (e) {
      showToast(
        e instanceof Error && 'body' in e
          ? (e as { body?: { error?: string } }).body?.error ?? 'Gagal menghapus'
          : 'Gagal menghapus',
        'error',
      );
    } finally {
      setDeletePending(false);
    }
  }

  const columns: Column<Pengganti>[] = [
    {
      key: 'date',
      header: 'Tanggal',
      render: (row) => (
        <span className="whitespace-nowrap font-medium text-primary-token">{row.date}</span>
      ),
    },
    {
      key: 'class',
      header: 'Kelas',
      render: (row) => <Badge tone="primary">{row.class_code.replace(/_/g, '-')}</Badge>,
    },
    {
      key: 'kind',
      header: 'Jenis',
      render: (row) => (
        <Badge tone={row.kind === 'replace' ? 'warning' : row.kind === 'add' ? 'success' : 'info'}>
          {KIND_LABELS[row.kind]}
        </Badge>
      ),
    },
    {
      key: 'sessions',
      header: 'Sesi',
      render: (row) =>
        Array.isArray(row.sessions) && row.sessions.length > 0 ? (
          <div className="min-w-[240px] space-y-1">
            {row.sessions.map((s, i) => (
              <p key={i} className="text-sm text-secondary-token">
                <span className="font-medium text-primary-token">{s.time}</span>
                {' · '}
                {s.course_code}
                {' · '}
                {s.mode === 'online' ? 'Online' : s.room}
              </p>
            ))}
          </div>
        ) : (
          <span className="text-muted-token">—</span>
        ),
    },
    {
      key: 'note',
      header: 'Catatan',
      render: (row) => (
        <p className="max-w-[220px] truncate text-secondary-token" title={row.note ?? undefined}>
          {row.note || '—'}
        </p>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDeleting(row)}>
            <span className="text-red-600 dark:text-red-400">Hapus</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Jadwal Pengganti"
        description="Perubahan jadwal untuk tanggal tertentu, baik penggantian maupun penambahan sesi."
        actions={
          <Button variant="primary" onClick={openAdd} icon={<PlusIcon />}>
            Tambah Pengganti
          </Button>
        }
      />

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={loadError}
          onRetry={load}
          emptyTitle="Belum ada jadwal pengganti"
          emptyDescription="Tambahkan penggantian jadwal ketika ada permintaan dari dosen."
          emptyAction={
            <Button variant="primary" onClick={openAdd}>
              Tambah Pengganti
            </Button>
          }
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit Jadwal Pengganti' : 'Tambah Jadwal Pengganti'}
        size="xl"
        footer={
          <>
            <Button onClick={closeModal} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              Simpan
            </Button>
          </>
        }
      >
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSave();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Kelas"
              required
              value={form.class_code}
              onChange={(e) => setForm((p) => ({ ...p, class_code: e.target.value }))}
              disabled={!isGlobal}
            >
              <option value="">— Pilih kelas —</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, '-')}
                </option>
              ))}
            </SelectField>

            <TextField
              label="Tanggal"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />

            <SelectField
              label="Jenis"
              required
              value={form.kind}
              onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as Kind }))}
              hint={form.kind === 'info' ? 'Info tidak memuat sesi.' : undefined}
            >
              <option value="replace">Ganti Jadwal</option>
              <option value="add">Tambah Jadwal</option>
              <option value="info">Info</option>
            </SelectField>
          </div>

          <TextAreaField
            label="Catatan"
            value={form.note}
            onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            rows={2}
          />

          {form.kind !== 'info' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary-token">
                  Sesi ({form.sessions.length})
                </h3>
                <Button size="sm" onClick={addSession} icon={<PlusIcon />}>
                  Tambah Sesi
                </Button>
              </div>

              {sessionError && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {sessionError}
                </p>
              )}

              {form.sessions.length === 0 ? (
                <div className="panel-inset text-center">
                  <p className="text-sm text-muted-token">
                    Belum ada sesi. Tambahkan minimal satu sesi.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {form.sessions.map((row, i) => (
                    <SessionEditor
                      key={row.key}
                      row={row}
                      index={i}
                      errors={rowErrors[row.key] ?? {}}
                      rooms={rooms}
                      courseByName={courseByName}
                      lecturerByName={lecturerByName}
                      onChange={(field, value) => updateRow(row.key, field, value)}
                      onRemove={() => removeSession(row.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {saveError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Hapus Jadwal Pengganti"
        subject={
          deleting ? `${deleting.class_code.replace(/_/g, '-')} · ${deleting.date}` : undefined
        }
        message="Perubahan jadwal untuk tanggal tersebut akan dihapus."
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deletePending}
      />

      <NotifyPrompt
        open={notifyClass !== null}
        onClose={() => setNotifyClass(null)}
        defaultClass={notifyClass ?? ''}
        type="pengganti"
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

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}