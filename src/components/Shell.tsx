import { NavLink, Outlet } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Users, CalendarDays, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';

const tabs = [
  { to: '/', label: 'Patients', icon: Users, end: true },
  { to: '/today', label: 'Today', icon: CalendarDays, end: false },
];

/** Signed-in application frame: header, nav tabs, page outlet. */
export function Shell() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <img src="/images/logo-icon.png" alt="" className="h-8 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <div className="leading-tight">
              <div className="font-serif font-semibold">RMG Clinic Manager</div>
              <div className="text-xs text-muted-foreground">Patient records &amp; charts</div>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <nav className="border-b border-border bg-surface">
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

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
