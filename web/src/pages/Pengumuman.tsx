import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { apiClient } from '../api';
import type { Announcement } from '../types';

export default function Pengumuman() {
  const [data, setData] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Announcement | null>(null);

  useEffect(() => {
    apiClient.get<Announcement[]>('/announcements')
      .then(setData)
      .catch(() => setError('Gagal memuat pengumuman'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error) return <Error msg={error} />;

  if (selected) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => setSelected(null)} className="mb-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">&larr; Kembali</button>
        <h1 className="text-2xl font-bold text-primary-token mb-4">{selected.title}</h1>
        <div className="flex gap-2 mb-4">
          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-inset)] text-secondary-token">{formatDate(selected.created_at)}</span>
          {selected.pinned === 1 && <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">Disematkan</span>}
          {selected.expires_at && <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-inset)] text-secondary-token">Berakhir: {formatDate(selected.expires_at)}</span>}
        </div>
        <div className="prose prose-sm max-w-none text-secondary-token"><Markdown>{selected.body}</Markdown></div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-primary-token mb-6">Pengumuman</h1>
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-faint-token">Belum ada pengumuman</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ann) => (
            <button
              key={ann.id}
              onClick={() => setSelected(ann)}
              className="w-full text-left bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] p-4 hover:shadow-md transition"
            >
              <div className="flex items-start gap-2">
                {ann.pinned === 1 && <span className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 shrink-0" />}
                <div className="flex-1">
                  <h3 className="font-semibold text-primary-token">{ann.title}</h3>
                  <p className="text-sm text-muted-token mt-1">{formatDate(ann.created_at)}{ann.pinned === 1 ? ' · Disematkan' : ''}</p>
                </div>
                <svg className="w-4 h-4 text-faint-token mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function Skeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="h-8 bg-[var(--surface-inset)] rounded w-48 mb-6 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-[var(--surface-inset)] rounded-xl animate-pulse" />)}
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
