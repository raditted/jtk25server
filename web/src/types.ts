export interface ScheduleSession {
  id?: number;
  time: string;
  course_code: string;
  course_name: string;
  type: string;
  lecturer_code: string;
  lecturer: string;
  room: string;
  mode?: string;
}

export interface DaySchedule {
  day: string;
  sessions: ScheduleSession[];
}

export interface ClassSchedule {
  class_name: string;
  schedule: DaySchedule[];
}

export interface SchedulesResponse {
  semester: string;
  classes: ClassSchedule[];
}

export interface PenggantiSession {
  time: string;
  course_code: string;
  course_name: string;
  type: string;
  lecturer_code: string;
  lecturer: string;
  room: string;
  mode?: 'offline' | 'online';
}

export interface Pengganti {
  id: number;
  ext_id: string;
  class_code: string;
  date: string;
  kind: 'replace' | 'add' | 'info';
  note: string | null;
  sessions: PenggantiSession[];
  created_at: string;
  updated_at: string;
}

export interface Announcement {
  id: number;
  ext_id: string;
  title: string;
  body: string;
  pinned: number;
  class_name: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface CalendarEvent {
  id: number;
  ext_id: string;
  title: string;
  description: string | null;
  date: string;
  end_date: string;
  location: string | null;
  category: string | null;
  class_name: string | null;
  collection_time: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: number;
  ext_id: string;
  name: string;
  type: 'kelas' | 'lab' | 'online';
}

export interface AuthResult {
  ok: boolean;
  scope: 'global' | `class:${string}`;
}

export type AdminScope = 'global' | `class:${string}`;

/** Mirrors CLASS_LIST in server/src/admin.ts. */
export const CLASS_LIST = [
  'D3-1A', 'D3-1B', 'D3-2A', 'D3-2B', 'D3-3A', 'D3-3B', 'D3-3C',
  'D4-1A', 'D4-1B', 'D4-1C', 'D4-1D', 'D4-2A', 'D4-2B', 'D4-2C', 'D4-2D',
  'D4-3A', 'D4-3B', 'D4-4A', 'D4-4B',
] as const;

export const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'] as const;
