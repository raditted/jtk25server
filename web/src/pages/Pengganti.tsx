import { useState, useEffect } from 'react';
import { apiClient } from '../api';
import type { Pengganti } from '../types';

export default function Pengganti() {
  const [data, setData] = useState<Pengganti[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterClass, setFilterClass] = useState('');

  useEffect(() => {
    apiClient.get<Pengganti[]>('/pengganti')
      .then(setData)
      .catch(() => setError('Gagal memuat data pengganti'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <Error msg={error} />;

  const filtered = filterClass
    ? data.filter((p) => p.class_code === filterClass)
    : data;

  const classes = [...new Set(data.map((p) => p.class_code))].sort();

  const kindLabel: Record<string, { text: string; color: string }> = {
    replace: { text: 'Pengganti', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
    add: { text: 'Penambahan', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
    info: { text: 'Info', color: 'bg-[var(--surface-inset)] text-secondary-token' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-primary-token mb-6">Pengganti</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-primary-token mb-2">Filter Kelas</label>
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 border border-[var(--border-strong)] bg-[var(--surface-raised)] text-primary-token rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Semua Kelas</option>
          {classes.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, '-')}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-faint-token">Tidak ada data pengganti</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const kind = kindLabel[item.kind] || kindLabel.info;
            return (
              <div key={item.id} className="bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kind.color}`}>
                      {kind.text}
                    </span>
                    <span className="font-semibold text-primary-token">
                      {item.class_code.replace(/_/g, '-')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-token">{formatDate(item.date)}</span>
                </div>
                {item.note && (
                  <p className="text-sm text-secondary-token mb-2">{item.note}</p>
                )}
                {item.sessions.length > 0 && (
                  <div className="mt-3 bg-[var(--surface-inset)] rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-token mb-2">Detail Jadwal:</p>
                    {item.sessions.map((s, i) => (
                      <div key={i} className="text-sm text-primary-token">
                        <span className="font-medium">{s.time}</span> &middot;{' '}
                        {s.course_name} ({s.course_code}) &middot;{' '}
                        {s.lecturer} &middot; {s.room} &middot;{' '}
                        {(s.mode || 'offline') === 'online' ? (
                          <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 0 1 7.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 0 1 1.06 0Z" /></svg>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted-token">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>
                            Offline
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-8 bg-[var(--surface-inset)] rounded w-48 mb-6 animate-pulse" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--surface-inset)] rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function Error({ msg }: { msg: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
      <p className="text-muted-token">{msg}</p>
    </div>
  );
}
