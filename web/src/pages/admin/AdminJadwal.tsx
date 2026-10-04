import { useEffect, useMemo, useState } from 'react';
import { apiClient, isGlobalAdmin } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import type { SchedulesResponse, ScheduleSession, Room } from '../../types';
import { DAYS, CLASS_LIST } from '../../types';
import { PageHeader } from '../../components/AdminLayout';
import NotifyPrompt from '../../components/NotifyPrompt';
import Badge, { ModeBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { SelectField, TextField } from '../../components/ui/Field';
import Modal from '../../components/Modal';
import { showToast } from '../../components/Toast';

interface FormData {
  class_name: string;
  semester: string;
  day: string;
  time: string;
  course_code: string;
  course_name: string;
  type: string;
  lecturer_code: string;
  lecturer: string;
  room: string;
  slot_order: number;
  mode: string;
}

const EMPTY_FORM: FormData = {
  class_name: '',
  semester: '',
  day: 'SENIN',
  time: '',
  course_code: '',
  course_name: '',
  type: 'TE',
  lecturer_code: '',
  lecturer: '',
  room: '',
  slot_order: 0,
  mode: 'offline',
};

/** Room ids that mark a session as online (mirrors the server's rule). */
function isOnlineRoom(room: string): boolean {
  return room.startsWith('Online-');
}

export default function AdminJadwal() {
  const { scope } = useAuth();
  const isGlobal = isGlobalAdmin();
  const myClass = !isGlobal ? scope?.replace('class:', '') : null;

  const [data, setData] = useState<SchedulesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState('');

  const [rooms, setRooms] = useState<Room[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [notifyClass, setNotifyClass] = useState<string | null>(null);

  const load = useMemo(
    () => async (keepClass?: string) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiClient.get<SchedulesResponse>('/admin/schedules');
        setData(res);
        setSelectedClass((prev) => {
          const wanted = keepClass ?? prev;
          const names = res.classes.map((c) => c.class_name);
          if (wanted && names.includes(wanted)) return wanted;
          return names[0] ?? '';
        });
      } catch {
        setLoadError('Gagal memuat jadwal');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    apiClient.get<Room[]>('/rooms').then(setRooms).catch(() => setRooms([]));
  }, []);

  const selected = data?.classes.find((c) => c.class_name === selectedClass);

  // A room whose type is online forces mode online, matching server behaviour.
  const onlineRoomIds = useMemo(
    () => new Set(rooms.filter((r) => r.type === 'online').map((r) => r.ext_id)),
    [rooms],
  );

  const classList = useMemo(() => {
    const available = new Set((data?.classes ?? []).map((c) => c.class_name));
    const list = CLASS_LIST.filter((c) => available.has(c));
    return list.length > 0 ? list : Array.from(available);
  }, [data]);

  /** Existing time ranges, offered as suggestions but still free text. */
  const timeOptions = useMemo(() => {
    const times = new Set<string>();
    data?.classes.forEach((c) =>
      c.schedule.forEach((d) => d.sessions.forEach((s) => times.add(s.time))),
    );
    return Array.from(times).sort();
  }, [data]);

  /** Known courses, so code↔name can be filled in automatically. */
  const courseLookup = useMemo(() => {
    const byCode = new Map<string, string>();
    const byName = new Map<string, string>();
    data?.classes.forEach((c) =>
      c.schedule.forEach((d) =>
        d.sessions.forEach((s) => {
          if (s.course_code && !byCode.has(s.course_code)) {
            byCode.set(s.course_code, s.course_name);
          }
          if (s.course_name && !byName.has(s.course_name)) {
            byName.set(s.course_name, s.course_code);
          }
        }),
      ),
    );
    return { byCode, byName };
  }, [data]);

  const lecturerLookup = useMemo(() => {
    const byCode = new Map<string, string>();
    const byName = new Map<string, string>();
    data?.classes.forEach((c) =>
      c.schedule.forEach((d) =>
        d.sessions.forEach((s) => {
          if (s.lecturer_code && !byCode.has(s.lecturer_code)) {
            byCode.set(s.lecturer_code, s.lecturer);
          }
          if (s.lecturer && !byName.has(s.lecturer)) {
            byName.set(s.lecturer, s.lecturer_code);
          }
        }),
      ),
    );
    return { byCode, byName };
  }, [data]);

  /** Dosen codes seen in any schedule, for the code/name pickers. */
  const dosenOptions = useMemo(
    () =>
      Array.from(lecturerLookup.byCode.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [lecturerLookup],
  );

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key as string]: '' }));
  }

  function handleCourseCodeChange(val: string) {
    setForm((prev) => ({
      ...prev,
      course_code: val,
      course_name: courseLookup.byCode.get(val) ?? prev.course_name,
    }));
  }

  function handleCourseNameChange(val: string) {
    setForm((prev) => ({
      ...prev,
      course_name: val,
      course_code: courseLookup.byName.get(val) ?? prev.course_code,
    }));
  }

  function handleLecturerCodeChange(val: string) {
    setForm((prev) => ({
      ...prev,
      lecturer_code: val,
      lecturer: lecturerLookup.byCode.get(val) ?? prev.lecturer,
    }));
  }

  function handleLecturerNameChange(val: string) {
    setForm((prev) => ({
      ...prev,
      lecturer: val,
      lecturer_code: lecturerLookup.byName.get(val) ?? prev.lecturer_code,
    }));
  }

  /** Picking a room updates mode so the two never disagree. */
  function handleRoomChange(val: string) {
    setForm((prev) => ({
      ...prev,
      room: val,
      mode: isOnlineRoom(val) || onlineRoomIds.has(val) ? 'online' : 'offline',
    }));
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      class_name: myClass || selectedClass || '',
      semester: data?.semester || '',
      day: DAYS.find((d) => selected?.schedule.some((s) => s.day === d)) ?? 'SENIN',
    });
    setFieldErrors({});
    setSaveError(null);
    setModalOpen(true);
  }

  function openEdit(session: ScheduleSession, day: string, cls: string) {
    setEditingId(session.id ?? null);
    setForm({
      class_name: cls,
      day,
      time: session.time,
      course_code: session.course_code,
      course_name: session.course_name,
      type: session.type,
      lecturer_code: session.lecturer_code,
      lecturer: session.lecturer,
      room: session.room,
      semester: data?.semester ?? '',
      slot_order: 0,
      mode: session.mode ?? 'offline',
    });
    setFieldErrors({});
    setSaveError(null);
    setModalOpen(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    const checks: Array<[keyof FormData, string, string]> = [
      ['class_name', form.class_name, 'Kelas'],
      ['day', form.day, 'Hari'],
      ['time', form.time, 'Jam'],
      ['course_code', form.course_code, 'Kode MK'],
      ['course_name', form.course_name, 'Nama MK'],
      ['type', form.type, 'Tipe'],
      ['lecturer_code', form.lecturer_code, 'Kode Dosen'],
      ['room', form.room, 'Ruang'],
    ];
    for (const [field, value, label] of checks) {
      if (!value.trim()) errors[field as string] = `${label} wajib diisi`;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingId === null) {
        await apiClient.post('/admin/schedules', form);
      } else {
        await apiClient.put(`/admin/schedules/${editingId}`, form);
      }
      showToast(editingId === null ? 'Jadwal ditambahkan' : 'Jadwal diperbarui', 'success');
      setModalOpen(false);
      await load(form.class_name);
      setNotifyClass(form.class_name);
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
    if (!deleteTarget) return;
    setDeletePending(true);
    try {
      await apiClient.delete(`/admin/schedules/${deleteTarget.id}`);
      showToast('Jadwal dihapus', 'success');
      setDeleteTarget(null);
      await load();
      setNotifyClass(selectedClass);
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

  const onlineRooms = rooms.filter((r) => r.type === 'online');
  const physicalRooms = rooms.filter((r) => r.type !== 'online');

  return (
    <>
      <PageHeader
        title="Kelola Jadwal"
        description="Sesi kuliah tetap untuk setiap kelas. Sesi online memakai ruang virtual dan tidak memblokir ruangan fisik."
        actions={
          <Button variant="primary" onClick={openAdd} icon={<PlusIcon />}>
            Tambah Jadwal
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <SelectField label="Kelas" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            {classList.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, '-')}
              </option>
            ))}
          </SelectField>
        </div>
        <Button onClick={() => void load()} loading={loading}>
          Muat ulang
        </Button>
      </div>

      {loading && !data ? (
        <div className="card flex items-center justify-center gap-3 px-6 py-14" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          <span className="text-sm text-muted-token">Memuat…</span>
        </div>
      ) : loadError ? (
        <div role="alert" className="card px-6 py-14 text-center">
          <p className="font-medium text-primary-token">{loadError}</p>
          <Button className="mt-3" onClick={() => void load()}>
            Coba lagi
          </Button>
        </div>
      ) : !selected || selected.schedule.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="font-medium text-primary-token">Belum ada jadwal untuk kelas ini</p>
          <p className="mt-1 text-sm text-muted-token">
            Tambahkan sesi pertama untuk {selectedClass || 'kelas ini'}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {DAYS.filter((day) => selected.schedule.some((d) => d.day === day)).map((day) => {
            const daySchedule = selected.schedule.find((d) => d.day === day);
            if (!daySchedule) return null;

            return (
              <section key={day} className="card overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-inset)] px-4 py-3">
                  <h2 className="text-sm font-semibold text-primary-token">{day}</h2>
                  <Badge tone="neutral">{daySchedule.sessions.length} sesi</Badge>
                </header>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        {['Jam', 'Mata Kuliah', 'Tipe', 'Dosen', 'Ruang', 'Mode', 'Aksi'].map((h, i) => (
                          <th
                            key={h}
                            scope="col"
                            className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-token ${
                              i === 5 || i === 6 ? 'text-right' : 'text-left'
                            }`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daySchedule.sessions.map((s, i) => (
                        <tr
                          key={s.id ?? i}
                          className="border-b border-[var(--border-subtle)] transition-colors last:border-0 hover:bg-[var(--surface-hover)]"
                        >
                          <td className="whitespace-nowrap px-4 py-3 font-medium text-primary-token">{s.time}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-primary-token">{s.course_code}</p>
                            <p className="mt-0.5 text-xs text-muted-token">{s.course_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={s.type === 'TE' ? 'info' : 'success'}>
                              {s.type === 'TE' ? 'Teori' : 'Praktik'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-secondary-token">
                            {s.lecturer || s.lecturer_code}
                          </td>
                          <td className="px-4 py-3 text-secondary-token">{s.room}</td>
                          <td className="px-4 py-3 text-right">
                            <ModeBadge mode={s.mode} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => openEdit(s, day, selected.class_name)}>
                                Edit
                              </Button>
                              {s.id != null && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: s.id!,
                                      label: `${s.time} · ${s.course_code} · ${s.course_name}`,
                                    })
                                  }
                                >
                                  <span className="text-red-600 dark:text-red-400">Hapus</span>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editingId !== null ? 'Edit Jadwal' : 'Tambah Jadwal'}
        size="lg"
        footer={
          <>
            <Button onClick={() => setModalOpen(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Kelas"
              required
              value={form.class_name}
              onChange={(e) => setField('class_name', e.target.value)}
              disabled={!isGlobal}
              error={fieldErrors.class_name}
            >
              {classList.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, '-')}
                </option>
              ))}
            </SelectField>

            <SelectField
              label="Hari"
              required
              value={form.day}
              onChange={(e) => setField('day', e.target.value)}
              error={fieldErrors.day}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Jam"
              required
              value={form.time}
              onChange={(e) => setField('time', e.target.value)}
              error={fieldErrors.time}
              placeholder="07.00-07.50"
              list="jadwal-times"
            />
            <datalist id="jadwal-times">
              {timeOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>

            <SelectField
              label="Tipe"
              required
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              error={fieldErrors.type}
            >
              <option value="TE">Teori</option>
              <option value="PR">Praktikum</option>
            </SelectField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Kode MK"
              required
              value={form.course_code}
              onChange={(e) => handleCourseCodeChange(e.target.value)}
              error={fieldErrors.course_code}
              placeholder="25TI2103"
              list="jadwal-courses"
            />
            <datalist id="jadwal-courses">
              {Array.from(courseLookup.byCode.entries()).map(([code, name]) => (
                <option key={code} value={code}>{`${code} — ${name}`}</option>
              ))}
            </datalist>

            <TextField
              label="Nama MK"
              required
              value={form.course_name}
              onChange={(e) => handleCourseNameChange(e.target.value)}
              error={fieldErrors.course_name}
              placeholder="Aljabar Linear"
              list="jadwal-course-names"
            />
            <datalist id="jadwal-course-names">
              {Array.from(courseLookup.byName.entries()).map(([name, code]) => (
                <option key={name} value={name}>{`${code} — ${name}`}</option>
              ))}
            </datalist>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Kode Dosen"
              required
              value={form.lecturer_code}
              onChange={(e) => handleLecturerCodeChange(e.target.value)}
              error={fieldErrors.lecturer_code}
              placeholder="MR"
              list="jadwal-dosen"
            />
            <datalist id="jadwal-dosen">
              {dosenOptions.map((d) => (
                <option key={d.code} value={d.code}>{`${d.code} — ${d.name}`}</option>
              ))}
            </datalist>

            <TextField
              label="Nama Dosen"
              value={form.lecturer}
              onChange={(e) => handleLecturerNameChange(e.target.value)}
              list="jadwal-dosen-names"
            />
            <datalist id="jadwal-dosen-names">
              {dosenOptions.map((d) => (
                <option key={d.code} value={d.name}>{`${d.code} — ${d.name}`}</option>
              ))}
            </datalist>
          </div>

          {/* Room and mode are kept consistent: an online room forces online. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Ruang"
              required
              value={form.room}
              onChange={(e) => handleRoomChange(e.target.value)}
              error={fieldErrors.room}
              hint="Pilih ruang online untuk sesi jarak jauh."
            >
              <option value="">— Pilih ruangan —</option>
              {onlineRooms.length > 0 && (
                <optgroup label="Online">
                  {onlineRooms.map((r) => (
                    <option key={r.ext_id} value={r.ext_id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Ruangan fisik">
                {physicalRooms.map((r) => (
                  <option key={r.ext_id} value={r.ext_id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            </SelectField>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-primary-token">Mode</span>
              <div className="flex min-h-[40px] items-center">
                <ModeBadge mode={form.mode} />
              </div>
              <p className="mt-1.5 text-sm text-muted-token">
                Diatur otomatis dari pilihan ruangan.
              </p>
            </div>
          </div>

          {saveError && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {saveError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Jadwal"
        subject={deleteTarget?.label}
        message="Sesi ini akan dihapus dari jadwal kelas."
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deletePending}
      />

      <NotifyPrompt
        open={notifyClass !== null}
        onClose={() => setNotifyClass(null)}
        defaultClass={notifyClass ?? ''}
        type="jadwal"
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