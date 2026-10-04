import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { PageHeader } from '../../components/AdminLayout';
import Badge from '../../components/ui/Badge';

interface Section {
  path: string;
  title: string;
  desc: string;
  icon: ReactNode;
  globalOnly?: boolean;
}

const sections: Section[] = [
  {
    path: '/admin/jadwal',
    title: 'Jadwal',
    desc: 'Sesi kuliah tetap per kelas',
    icon: <IconCalendar />,
  },
  {
    path: '/admin/pengganti',
    title: 'Pengganti',
    desc: 'Kelas pengganti dan penambahan',
    icon: <IconRepeat />,
  },
  {
    path: '/admin/kalender',
    title: 'Kalender',
    desc: 'Kegiatan dan tugas kampus',
    icon: <IconSparkle />,
  },
  {
    path: '/admin/pengumuman',
    title: 'Pengumuman',
    desc: 'Info yang tampil di aplikasi',
    icon: <IconMegaphone />,
  },
  {
    path: '/admin/ruangan',
    title: 'Ruangan',
    desc: 'Ruang fisik dan ruang online',
    icon: <IconDoor />,
    globalOnly: true,
  },
];

export default function AdminDashboard() {
  const { scope, isGlobal } = useAuth();

  const visible = sections.filter((s) => !s.globalOnly || isGlobal);

  return (
    <>
      <PageHeader
        title="Admin Panel"
        description="Kelola data yang ditampilkan di aplikasi JTK25."
        actions={
          <Badge tone={isGlobal ? 'success' : 'primary'}>
            {isGlobal ? 'Akses global' : `Kelas ${scope?.replace('class:', '')}`}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => (
          <Link
            key={s.path}
            to={s.path}
            className="card group p-5 transition-all hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-pop dark:hover:border-primary-800"
          >
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-100 dark:bg-primary-950 dark:text-primary-400">
              {s.icon}
            </div>
            <h2 className="text-base font-semibold text-primary-token transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-400">
              {s.title}
            </h2>
            <p className="mt-1 text-sm text-secondary-token">{s.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h12a4 4 0 0 1 0 8h-2m0 0 3-3m-3 3-3-3M20 16H8a4 4 0 0 1 0-8h2m0 0L7 5m3 3-3 3" />
    </svg>
  );
}

function IconSparkle() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4m-2-2h4m9 4v4m-2-2h4M6 17v3m-1.5-1.5h3M13 4l1.5 3.5L18 9l-3.5 1.5L13 14l-1.5-3.5L8 9l3.5-1.5L13 4Z" />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Zm12-1a4 4 0 0 1 0 4" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M3 21h18M10 12h.01" />
    </svg>
  );
}