import { NavLink, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Users, CalendarDays, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { SyncBadge } from './SyncBadge';
import { IdleGuard } from './IdleGuard';

const tabs = [
  { to: '/', label: 'Patients', icon: Users, end: true },
  { to: '/today', label: 'Today', icon: CalendarDays, end: false },
];

/** Signed-in application frame: header, nav (top on desktop, bottom bar on phones), page outlet. */
export function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-5">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-icon.png" alt="" className="h-8 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <div className="leading-tight">
              <div className="font-serif font-semibold">RMG Clinic Manager</div>
              <div className="hidden text-xs text-muted-foreground sm:block">Patient records &amp; charts</div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <SyncBadge />
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-1.5 rounded-lg border border-border p-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3.5 sm:py-2"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Desktop: tab bar under the header */}
      <nav className="hidden border-b border-border bg-surface sm:block">
        <div className="mx-auto flex w-full max-w-6xl gap-1 px-5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                  isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`
              }
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Room for the bottom bar on phones */}
      <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 sm:px-5 sm:py-8 sm:pb-8">
        <Outlet />
      </main>

      {/* Phones: app-style bottom navigation, thumb territory */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface sm:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-14 place-items-center rounded-full ${isActive ? 'bg-primary-soft' : ''}`}>
                    <t.icon className="h-5 w-5" />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <IdleGuard />
    </div>
  );
}
