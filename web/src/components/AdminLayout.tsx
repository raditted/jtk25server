import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Button from './ui/Button';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  /** Hidden from class-scoped admins (rooms management requires global). */
  globalOnly?: boolean;
}

const NAV: NavItem[] = [
  {
    to: '/admin',
    label: 'Ringkasan',
    icon: <IconGrid />,
  },
  {
    to: '/admin/jadwal',
    label: 'Jadwal',
    icon: <IconCalendar />,
  },
  {
    to: '/admin/pengganti',
    label: 'Pengganti',
    icon: <IconRepeat />,
  },
  {
    to: '/admin/kalender',
    label: 'Kalender',
    icon: <IconCalendar />,
  },
  {
    to: '/admin/pengumuman',
    label: 'Pengumuman',
    icon: <IconMegaphone />,
  },
  {
    to: '/admin/ruangan',
    label: 'Ruangan',
    icon: <IconDoor />,
    globalOnly: true,
  },
];

/**
 * Admin shell.
 *
 * The admin pages used to render inside the public site's header/footer with
 * no navigation between sections and a single red "Admin" link. This provides a
 * persistent sidebar, the signed-in scope, and theme + logout controls.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { scope, isGlobal, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const items = NAV.filter((n) => !n.globalOnly || isGlobal);

  function handleLogout() {
    logout();
    navigate('/admin/login', { replace: true });
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]">
        <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Buka menu navigasi"
            aria-expanded={navOpen}
            className="rounded-lg p-2 text-secondary-token transition-colors hover:bg-[var(--surface-inset)] lg:hidden"
          >
            <IconMenu />
          </button>

          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-primary-token">
              Admin JTK25
            </span>
            <span className="truncate text-xs text-muted-token">
              {scope === 'global' ? 'Akses global' : scope?.replace('class:', 'Kelas ')}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Ganti tema">
              <SunMoonIcon />
              <span className="hidden sm:inline">Tema</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav
          aria-label="Navigasi admin"
          className={`${
            navOpen ? 'block' : 'hidden'
          } fixed inset-x-0 top-16 z-20 border-b border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 lg:static lg:block lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-4`}
        >
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/admin'}
                  onClick={() => setNavOpen(false)}
                  className={({ isActive }) =>
                    [
                      'flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                        : 'text-secondary-token hover:bg-[var(--surface-inset)] hover:text-primary-token',
                    ].join(' ')
                  }
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
            <a
              href="/"
              className="flex min-h-[40px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-token transition-colors hover:bg-[var(--surface-inset)] hover:text-primary-token"
            >
              <IconExternal />
              Lihat situs publik
            </a>
          </div>
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

/** Page heading with optional description and right-aligned actions. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-primary-token">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-secondary-token">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────

function IconMenu() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h6v6H4zM14 5h6v6h-6zM4 13h6v6H4zM14 13h6v6h-6z" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h12a4 4 0 0 1 0 8h-2m0 0 3-3m-3 3-3-3M20 16H8a4 4 0 0 1 0-8h2m0 0L7 5m3 3-3 3" />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 11v2a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1Zm12-1a4 4 0 0 1 0 4" />
    </svg>
  );
}

function IconDoor() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 21V4a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v17M3 21h18M10 12h.01" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

function SunMoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2m0 14v2M5.6 5.6l1.4 1.4m10 10 1.4 1.4M3 12h2m14 0h2M5.6 18.4 7 17m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" />
    </svg>
  );
}