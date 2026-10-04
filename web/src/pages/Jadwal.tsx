import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import type { SchedulesResponse, ClassSchedule } from '../types';

const STORAGE_KEY = 'jtk25_selected_class';

export default function Jadwal() {
  const [data, setData] = useState<SchedulesResponse | null>(null);
  const [selectedClass, setSelectedClass] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiClient.get<SchedulesResponse>('/schedules')
      .then((sched) => {
        setData(sched);
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && sched.classes.some((c) => c.class_name === stored)) {
          setSelectedClass(stored);
        } else {
          const year2 = sched.classes.filter((c) => /[_-]2[A-Z]/.test(c.class_name));
          if (year2.length > 0) setSelectedClass(year2[0].class_name);
        }
      })
      .catch(() => setError('Gagal memuat jadwal'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;

  const classes = (data?.classes ?? []).filter((c) => /[_-]2[A-Z]/.test(c.class_name));
  const selected = classes.find((c) => c.class_name === selectedClass);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary-token mb-2">Jadwal Kuliah</h1>
        {data?.semester && <p className="text-sm text-muted-token">{data.semester}</p>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            localStorage.setItem(STORAGE_KEY, e.target.value);
          }}
          className="w-full sm:w-auto px-3 py-2 border border-[var(--border-strong)] bg-[var(--surface-raised)] text-primary-token rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {classes.map((c) => (
            <option key={c.class_name} value={c.class_name}>
              {c.class_name.replace(/_/g, '-')}
            </option>
          ))}
        </select>
      </div>

      {selected && <ScheduleTable data={selected} />}

      {!selected && classes.length === 0 && (
        <div className="text-center py-12 text-faint-token">Belum ada data jadwal</div>
      )}
    </div>
  );
}

function ScheduleTable({ data }: { data: ClassSchedule }) {
  return (
    <div className="space-y-6">
      {data.schedule.map((day) => (
        <div key={day.day} className="bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
          <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-b border-indigo-100 dark:border-indigo-800">
            <h3 className="font-semibold text-indigo-700 dark:text-indigo-300">{day.day}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-inset)]">
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Jam</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Kode</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Mata Kuliah</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Tipe</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Dosen</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-token">Ruang</th>
                </tr>
              </thead>
              <tbody>
                {day.sessions.map((s, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-primary-token">{s.time}</td>
                    <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-medium">{s.course_code}</td>
                    <td className="px-4 py-3 text-primary-token">{s.course_name}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.type === 'PR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-[var(--surface-inset)] text-secondary-token'
                      }`}>
                        {s.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-secondary-token">{s.lecturer || s.lecturer_code}</td>
                    <td className="px-4 py-3 text-secondary-token">{s.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-8 bg-[var(--surface-inset)] rounded w-48 mb-6 animate-pulse" />
      <div className="h-10 bg-[var(--surface-inset)] rounded w-64 mb-6 animate-pulse" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 mb-4 animate-pulse">
          <div className="h-6 bg-[var(--surface-inset)] rounded w-32 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-12 bg-[var(--surface-inset)] rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
      <p className="text-muted-token">{message}</p>
    </div>
  );
}
