import { useState, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { apiClient } from '../api';
import type { CalendarEvent, Pengganti } from '../types';
import { CLASS_LIST } from '../types';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

type CalendarItem =
  | { type: 'event'; event: CalendarEvent }
  | { type: 'pengganti'; entry: Pengganti };

type ViewMode = 'list' | 'grid';

// ---------------------------------------------------------------------------
// Timezone-safe date parsing (fixes UTC midnight drift)
// ---------------------------------------------------------------------------

/** Parse 'YYYY-MM-DD' into a local Date without timezone shift. */
function parseLocalDate(iso: string): Date {
  const datePart = iso.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format an ISO date/datetime as a stable key: 'YYYY-M-D' (day without zero-pad). */
function dateKey(iso: string): string {
  const datePart = iso.split('T')[0];
  const [y, m, d] = datePart.split('-').map(Number);
  return `${y}-${m - 1}-${d}`;
}

// ---------------------------------------------------------------------------
// Grouped month list helpers
// ---------------------------------------------------------------------------

interface MonthGroup {
  year: number;
  month: number;
  label: string;
  items: CalendarItem[];
  hasFuture: boolean;
}

function groupByMonth(items: CalendarItem[]): MonthGroup[] {
  const map = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const iso = item.type === 'event' ? item.event.date : item.entry.date;
    const d = parseLocalDate(iso);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups: MonthGroup[] = [];
  for (const [key, items] of map) {
    const [y, m] = key.split('-').map(Number);
    const hasFuture = items.some((item) => {
      const iso = item.type === 'event' ? item.event.date : item.entry.date;
      return parseLocalDate(iso) >= today;
    });
    groups.push({
      year: y,
      month: m,
      label: `${MONTH_NAMES[m]} ${y}`,
      items: items.sort((a, b) => {
        const aIso = a.type === 'event' ? a.event.date : a.entry.date;
        const bIso = b.type === 'event' ? b.event.date : b.entry.date;
        return aIso.localeCompare(bIso);
      }),
      hasFuture,
    });
  }

  groups.sort((a, b) => {
    if (a.hasFuture && !b.hasFuture) return -1;
    if (!a.hasFuture && b.hasFuture) return 1;
    return b.year * 12 + b.month - (a.year * 12 + a.month);
  });

  return groups;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Ujian': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-l-red-500' },
  'UTS': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-l-red-500' },
  'UAS': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-l-red-500' },
  'Tugas': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-l-amber-500' },
  'Kuliah': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-l-indigo-500' },
  'Libur': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-l-emerald-500' },
  'Kegiatan': { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-l-violet-500' },
};

const DEFAULT_CATEGORY_COLOR = { bg: 'bg-[var(--surface-inset)]', text: 'text-primary-token', border: 'border-l-gray-400' };

function getCategoryColor(category: string | null) {
  if (!category) return DEFAULT_CATEGORY_COLOR;
  return CATEGORY_COLORS[category] ?? DEFAULT_CATEGORY_COLOR;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Kalender() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pengganti, setPengganti] = useState<Pengganti[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth());
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return window.innerWidth < 768 ? 'list' : 'list';
  });

  const fetchData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      apiClient.get<CalendarEvent[]>('/calendar'),
      apiClient.get<Pengganti[]>('/pengganti'),
    ])
      .then(([cal, pg]) => {
        setEvents(cal);
        setPengganti(pg);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Gagal memuat data kalender');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const filteredEvents = useMemo(() => {
    if (!selectedClass) return events.filter((e) => !e.class_name);
    return events.filter((e) => !e.class_name || e.class_name === selectedClass);
  }, [events, selectedClass]);

  const filteredPengganti = useMemo(() => {
    if (!selectedClass) return [];
    const classCode = selectedClass.replace(/_/g, '-');
    return pengganti.filter((p) => p.class_code === classCode);
  }, [pengganti, selectedClass]);

  const allItems = useMemo<CalendarItem[]>(() => {
    const items: CalendarItem[] = [];
    for (const event of filteredEvents) {
      items.push({ type: 'event', event });
    }
    for (const entry of filteredPengganti) {
      items.push({ type: 'pengganti', entry });
    }
    return items;
  }, [filteredEvents, filteredPengganti]);

  const classCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (event.class_name) {
        counts.set(event.class_name, (counts.get(event.class_name) ?? 0) + 1);
      }
    }
    for (const entry of pengganti) {
      const code = entry.class_code.replace(/-/g, '_');
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
    return counts;
  }, [events, pengganti]);

  const totalUnfiltered = events.length + pengganti.length;

  const dateMap = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();

    for (const event of filteredEvents) {
      const key = dateKey(event.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'event', event });

      if (event.end_date) {
        const endKey = dateKey(event.end_date);
        if (endKey !== key && !map.has(endKey)) {
          map.set(endKey, [{ type: 'event', event }]);
        }
      }
    }

    for (const entry of filteredPengganti) {
      const key = dateKey(entry.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ type: 'pengganti', entry });
    }

    return map;
  }, [filteredEvents, filteredPengganti]);

  const monthGroups = useMemo(() => groupByMonth(allItems), [allItems]);

  const selectedItems = useMemo(() => {
    if (!selectedDate) return null;
    const key = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`;
    return dateMap.get(key) ?? null;
  }, [selectedDate, dateMap]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const totalCells = startWeekday + daysInMonth;
  const rows = Math.ceil(totalCells / 7);
  const today = new Date();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 bg-[var(--surface-inset)] rounded-lg w-56 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-[var(--surface-inset)] rounded-lg animate-pulse" />
            <div className="h-9 w-20 bg-[var(--surface-inset)] rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2 mb-6 overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="h-9 bg-[var(--surface-inset)] rounded-full animate-pulse flex-shrink-0"
              style={{ width: `${60 + (i % 3) * 12}px`, animationDelay: `${i * 75}ms` }} />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-[var(--surface-inset)]/50 rounded-xl p-4 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start gap-3">
                <div className="w-1 h-12 bg-[var(--border-strong)] rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-[var(--surface-inset)] rounded w-2/3" />
                  <div className="h-4 bg-[var(--surface-inset)] rounded w-1/3" />
                  <div className="h-3 bg-[var(--surface-inset)] rounded w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-primary-token mb-6">Kalender Akademik</h1>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-xl p-8 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-400 dark:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-red-700 dark:text-red-300 font-medium mb-1">Terjadi kesalahan</p>
          <p className="text-red-600/70 dark:text-red-400/70 text-sm mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-5 py-2.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary-token">Kalender Akademik</h1>
          <p className="text-sm text-muted-token mt-0.5">
            {allItems.length} acara terjadwal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-[var(--surface-inset)] transition-colors disabled:opacity-50"
            title="Muat ulang"
          >
            <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <div className="flex gap-0.5 bg-[var(--surface-inset)] rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-[var(--surface-raised)] shadow-sm text-primary-token'
                  : 'text-muted-token hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Daftar
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface-raised)] shadow-sm text-primary-token'
                  : 'text-muted-token hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10 0a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
              Kalender
            </button>
          </div>
        </div>
      </div>

      <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-[color-mix(in_srgb,var(--surface-card)_80%,transparent)] backdrop-blur-lg border-b border-[var(--border-subtle)]">
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setSelectedClass(null)}
            className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              selectedClass === null
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:shadow-indigo-500/10'
                : 'bg-[var(--surface-inset)] text-secondary-token hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Semua
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              selectedClass === null
                ? 'bg-indigo-500/30 text-indigo-100'
                : 'bg-[var(--surface-inset)] text-muted-token'
            }`}>
              {totalUnfiltered}
            </span>
          </button>
          {CLASS_LIST.map((code) => {
            const count = classCounts.get(code) ?? 0;
            const isActive = selectedClass === code;
            return (
              <button
                key={code}
                onClick={() => setSelectedClass(isActive ? null : code)}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:shadow-indigo-500/10'
                    : 'bg-[var(--surface-inset)] text-secondary-token hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {code}
                {count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-indigo-500/30 text-indigo-100'
                      : 'bg-[var(--surface-inset)] text-muted-token'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {viewMode === 'list' ? (
          <ListView
            monthGroups={monthGroups}
            today={today}
            onJumpToMonth={(y, m) => {
              setCurrentMonth(new Date(y, m));
              setViewMode('grid');
            }}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] mb-4">
              <button
                onClick={() => setCurrentMonth(new Date(year, month - 1))}
                className="p-2 hover:bg-[var(--surface-inset)] rounded-lg text-muted-token transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-primary-token">{MONTH_NAMES[month]} {year}</span>
                <button
                  onClick={() => {
                    setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
                    setSelectedDate(today);
                  }}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  Hari ini
                </button>
              </div>
              <button
                onClick={() => setCurrentMonth(new Date(year, month + 1))}
                className="p-2 hover:bg-[var(--surface-inset)] rounded-lg text-muted-token transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-2">
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-faint-token uppercase tracking-wider">{d}</div>
              ))}
            </div>

            <div className="bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] overflow-hidden">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="grid grid-cols-7 border-b border-[var(--border-subtle)] last:border-b-0">
                  {Array.from({ length: 7 }, (_, col) => {
                    const cellIndex = row * 7 + col;
                    const dayNum = cellIndex - startWeekday + 1;
                    if (dayNum < 1 || dayNum > daysInMonth) {
                      return <div key={col} className="min-h-[80px] sm:min-h-[96px] border-r border-[var(--border-subtle)] last:border-r-0" />;
                    }

                    const date = new Date(year, month, dayNum);
                    const isToday = date.toDateString() === today.toDateString();
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const key = `${year}-${month}-${dayNum}`;
                    const items = dateMap.get(key);
                    const hasItems = items && items.length > 0;
                    const eventCount = items?.filter((i) => i.type === 'event').length ?? 0;
                    const hasPengganti = hasItems && items!.some((i) => i.type === 'pengganti');

                    return (
                      <button
                        key={col}
                        onClick={() => setSelectedDate(date)}
                        className={`relative min-h-[80px] sm:min-h-[96px] p-2 text-left border-r border-[var(--border-subtle)] last:border-r-0 transition-colors duration-150 ${
                          isSelected
                            ? 'bg-indigo-50/80 dark:bg-indigo-900/20'
                            : hasItems
                              ? 'hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer'
                              : 'hover:bg-[var(--surface-inset)]/50 dark:hover:bg-gray-800/20'
                        }`}
                      >
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                          isToday
                            ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30'
                            : isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold'
                              : 'text-primary-token'
                        }`}>
                          {dayNum}
                        </span>

                        {hasItems && (
                          <div className="mt-1.5 space-y-0.5">
                            {hasPengganti && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                                <span className="text-[10px] text-muted-token truncate">Pengganti</span>
                              </div>
                            )}
                            {eventCount > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                                <span className="text-[10px] text-muted-token truncate">
                                  {eventCount} acara
                                </span>
                              </div>
                            )}
                            {items!.length > 3 && (
                              <span className="text-[10px] text-faint-token font-medium">+{items!.length - 3}</span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4">
              {selectedDate === null ? (
                <div className="text-center py-12 text-faint-token">
                  <svg className="w-10 h-10 mx-auto mb-3 text-faint-token" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Pilih tanggal untuk melihat acara</p>
                </div>
              ) : !selectedItems || selectedItems.length === 0 ? (
                <div className="text-center py-12 text-faint-token">
                  <svg className="w-10 h-10 mx-auto mb-3 text-faint-token" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                  </svg>
                  <p className="text-sm">
                    Tidak ada acara pada {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-token">
                    {selectedItems.length} acara pada {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]}
                  </p>
                  {selectedItems.map((item, i) => renderCalendarItem(item, i))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ListView({ monthGroups, today, onJumpToMonth }: {
  monthGroups: MonthGroup[];
  today: Date;
  onJumpToMonth: (year: number, month: number) => void;
}) {
  if (monthGroups.length === 0) {
    return (
      <div className="text-center py-16">
        <svg className="w-14 h-14 mx-auto mb-4 text-faint-token" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <p className="text-muted-token font-medium">Tidak ada acara</p>
        <p className="text-sm text-faint-token mt-1">Tidak ada acara yang cocok dengan filter yang dipilih</p>
      </div>
    );
  }

  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-8">
      {monthGroups.map((group) => {
        const isCurrentMonth = group.year === today.getFullYear() && group.month === today.getMonth();
        return (
          <div key={`${group.year}-${group.month}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-primary-token">{group.label}</h2>
                {isCurrentMonth && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                    Bulan ini
                  </span>
                )}
              </div>
              <div className="flex-1 h-px bg-[var(--surface-inset)]" />
              <button
                onClick={() => onJumpToMonth(group.year, group.month)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors"
              >
                Lihat kalender
              </button>
            </div>

            <div className="relative ml-4">
              <div className="absolute left-0 top-2 bottom-2 w-px bg-[var(--surface-inset)]" />

              <div className="space-y-1">
                {group.items.map((item, i) => {
                  const iso = item.type === 'event' ? item.event.date : item.entry.date;
                  const itemDate = parseLocalDate(iso);
                  const itemDayKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
                  const isPast = dateKey(iso) < todayStr;
                  const isTodayItem = itemDayKey === todayKey;
                  const category = item.type === 'event' ? item.event.category : null;
                  const catColor = getCategoryColor(category);
                  const prevItem = i > 0 ? group.items[i - 1] : null;
                  const showDateLabel = i === 0 || itemDate.toDateString() !== parseLocalDate(
                    itemDateISO(prevItem!)
                  ).toDateString();

                  return (
                    <div key={`${itemKey(item)}-${i}`} className="relative pl-6">
                      <div className={`absolute left-0 top-4 w-2.5 h-2.5 -translate-x-[4.5px] rounded-full border-2 border-[var(--surface-page)] z-10 ${
                        isTodayItem
                          ? 'bg-indigo-600 ring-2 ring-indigo-600/20'
                          : item.type === 'pengganti'
                            ? 'bg-orange-500'
                            : isPast
                              ? 'bg-[var(--border-strong)]'
                              : 'bg-indigo-400 dark:bg-indigo-500'
                      }`} />

                      {showDateLabel && (
                        <div className="flex items-center gap-2 mb-2 mt-3 first:mt-0">
                          <span className={`text-xs font-semibold ${
                            isTodayItem
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : 'text-faint-token'
                          }`}>
                            {isTodayItem ? 'Hari ini' : formatDateID(itemDate)}
                          </span>
                          <div className="flex-1 h-px bg-[var(--surface-inset)]" />
                        </div>
                      )}

                      <div className={`mb-2 ${isPast ? 'opacity-50' : ''}`}>
                        {renderCalendarItem(item, i, isPast)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function itemKey(item: CalendarItem): string {
  return item.type === 'event' ? `ev-${item.event.id}` : `pg-${item.entry.id}`;
}

function itemDateISO(item: CalendarItem): string {
  return item.type === 'event' ? item.event.date : item.entry.date;
}

function formatDateID(date: Date): string {
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function renderCalendarItem(item: CalendarItem, index: number, isPast = false) {
  if (item.type === 'pengganti') {
    return renderPengganti(item.entry, index, isPast);
  }
  return renderEvent(item.event, index, isPast);
}

function renderPengganti(pg: Pengganti, index: number, isPast: boolean) {
  const kindConfig: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    replace: {
      label: 'Pengganti',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-l-orange-500',
      dot: 'bg-orange-500',
    },
    add: {
      label: 'Penambahan',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-l-blue-500',
      dot: 'bg-blue-500',
    },
    info: {
      label: 'Info',
      bg: 'bg-[var(--surface-inset)]/50',
      text: 'text-primary-token',
      border: 'border-l-gray-400',
      dot: 'bg-gray-400',
    },
  };

  const kind = kindConfig[pg.kind] ?? kindConfig.info;

  return (
    <div
      key={`pg-${pg.id}-${index}`}
      className={`bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] border-l-4 ${kind.border} overflow-hidden transition-shadow hover:shadow-md`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${kind.bg} ${kind.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${kind.dot}`} />
              {kind.label}
            </span>
            <span className="text-sm font-bold text-primary-token">{pg.class_code}</span>
            {isPast && (
              <span className="text-[10px] text-faint-token italic">sudah lewat</span>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-primary-token">
              {formatDateID(parseLocalDate(pg.date))}
            </p>
          </div>
        </div>

        {pg.note && (
          <p className="text-sm text-secondary-token mt-2 leading-relaxed">{pg.note}</p>
        )}

        {pg.sessions.length > 0 && (
          <div className="mt-3 bg-[var(--surface-inset)]/50 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-faint-token uppercase tracking-wider mb-2">
              {pg.sessions.length} Sesi Jadwal
            </p>
            <div className="space-y-1.5">
              {pg.sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs font-semibold text-muted-token bg-[var(--surface-inset)] px-1.5 py-0.5 rounded">
                    {s.time}
                  </span>
                  <span className="text-primary-token">{s.course_name}</span>
                  <span className="text-faint-token">&middot;</span>
                  <span className="text-muted-token text-xs">{s.lecturer}</span>
                  <span className="text-faint-token">&middot;</span>
                  <span className="text-muted-token text-xs">{s.room}</span>
                  {s.mode && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      s.mode === 'online'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-[var(--surface-inset)] text-secondary-token'
                    }`}>
                      {s.mode}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderEvent(event: CalendarEvent, index: number, isPast: boolean) {
  const isMultiDay = event.end_date && event.end_date !== event.date;
  const catColor = getCategoryColor(event.category);

  return (
    <div
      key={`ev-${event.id}-${index}`}
      className={`bg-[var(--surface-card)] rounded-xl shadow-sm border border-[var(--border-subtle)] border-l-4 ${catColor.border} overflow-hidden transition-shadow hover:shadow-md`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[var(--surface-inset)] flex flex-col items-center justify-center border border-[var(--border-subtle)]">
            <span className="text-lg font-bold text-primary-token leading-none">
              {parseLocalDate(event.date).getDate()}
            </span>
            <span className="text-[10px] font-semibold text-faint-token uppercase">
              {MONTH_NAMES[parseLocalDate(event.date).getMonth()].slice(0, 3)}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-primary-token leading-snug">{event.title}</h3>
              {isPast && (
                <span className="text-[10px] text-faint-token italic">sudah lewat</span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {event.category && (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${catColor.bg} ${catColor.text}`}>
                  {event.category}
                </span>
              )}

              <span className="flex items-center gap-1 text-xs text-muted-token">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDateRange(event.date, event.end_date)}
              </span>

              {isMultiDay && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300">
                  s/d {formatEndDate(event.end_date)}
                </span>
              )}
            </div>

            {event.location && (
              <p className="flex items-center gap-1.5 text-sm text-muted-token mt-2">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {event.location}
              </p>
            )}

            {event.collection_time && (
              <p className="flex items-center gap-1.5 text-sm text-muted-token mt-1.5">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pengumpulan: {event.collection_time}</span>
              </p>
            )}

            {event.description && (
              <div className="prose prose-sm max-w-none text-secondary-token mt-2">
                <Markdown>{event.description}</Markdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatEndDate(endIso: string): string {
  const end = parseLocalDate(endIso);
  return `${end.getDate()} ${MONTH_NAMES[end.getMonth()]}`;
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = parseLocalDate(startIso);
  const end = parseLocalDate(endIso);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('id-ID', opts)} – ${end.toLocaleDateString('id-ID', opts)}`;
}
