import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ChevronRight,
  FileJson,
  FileSpreadsheet,
  Loader2,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { exportFullBackup, exportPatientsCsv, getBackupStatus } from '../lib/exporter';
import { toast } from '../lib/toast';
import {
  ageOf,
  fullName,
  hasMedicalAlerts,
  matchesSearch,
  restorePatient,
  subscribePatients,
  type Patient,
} from '../lib/patients';

export function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [term, setTerm] = useState('');
  const [view, setView] = useState<'active' | 'archived'>('active');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backup, setBackup] = useState(() => getBackupStatus());

  async function onBackup() {
    if (!patients || backingUp) return;
    setBackingUp(true);
    try {
      await exportFullBackup(patients);
      setBackup(getBackupStatus());
      toast.success('Backup downloaded — keep it somewhere safe.');
    } catch {
      toast.error('Backup failed. Check your connection and try again.');
    } finally {
      setBackingUp(false);
    }
  }

  function onExportCsv() {
    if (!patients) return;
    try {
      exportPatientsCsv(patients);
    } catch {
      toast.error('Could not export the CSV. Please try again.');
    }
  }

  useEffect(() => subscribePatients(setPatients), []);

  const active = useMemo(() => (patients ?? []).filter((p) => !p.archived), [patients]);
  const archived = useMemo(() => (patients ?? []).filter((p) => p.archived), [patients]);
  const source = view === 'active' ? active : archived;
  const shown = useMemo(() => source.filter((p) => matchesSearch(p, term)), [source, term]);

  async function onRestore(p: Patient) {
    if (!p.id) return;
    setRestoringId(p.id);
    try {
      await restorePatient(p.id);
      setView('active');
    } catch {
      toast.error('Could not restore the patient. Please try again.');
    } finally {
      setRestoringId(null);
    }
  }

  // Nudge the doctor to keep an offline copy: never backed up, or 14+ days stale.
  const needsBackup =
    !!patients && patients.length > 0 && (backup.daysSince === null || backup.daysSince >= 14);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Patients</h1>
          {patients && (
            <p className="mt-1 text-sm text-muted-foreground">
              {active.length} active {active.length === 1 ? 'patient' : 'patients'}
              {archived.length > 0 && ` · ${archived.length} archived`}
            </p>
          )}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search name or phone"
              className="w-full rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 sm:w-64"
            />
          </div>
          <Link
            to="/patients/new"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover sm:px-4"
          >
            <Plus className="h-4 w-4" /> Add
            <span className="hidden sm:inline">patient</span>
          </Link>
        </div>
      </div>

      {/* Reminder to keep an offline copy of the records */}
      {needsBackup && (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-warn/30 bg-warn-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-sm text-foreground">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
            <p>
              <span className="font-semibold">
                {backup.daysSince === null
                  ? 'You haven’t saved a backup yet.'
                  : `Your last backup was ${backup.daysSince} day${backup.daysSince === 1 ? '' : 's'} ago.`}
              </span>{' '}
              Download a copy so patient records are safe even if something happens to this device.
            </p>
          </div>
          <button
            onClick={onBackup}
            disabled={backingUp}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileJson className="h-4 w-4" />}
            Back up now
          </button>
        </div>
      )}

      {/* Data belongs to the clinic: one-click exports */}
      {patients && patients.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold transition-colors hover:border-primary hover:text-foreground"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-ok" /> Export CSV
          </button>
          <button
            onClick={onBackup}
            disabled={backingUp}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold transition-colors hover:border-primary hover:text-foreground disabled:opacity-50"
          >
            {backingUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5 text-accent-ink" />}
            Full backup (JSON)
          </button>
          <span>
            {backup.daysSince === 0
              ? '— backed up today'
              : backup.daysSince !== null
                ? `— last backup ${backup.daysSince} day${backup.daysSince === 1 ? '' : 's'} ago`
                : '— includes charts and visit history'}
          </span>
        </div>
      )}

      {/* Active / Archived view toggle (archived only shows when it has records) */}
      {archived.length > 0 && (
        <div className="mt-5 flex gap-1 rounded-lg border border-border bg-surface p-0.5 w-fit">
          <button
            onClick={() => setView('active')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              view === 'active' ? 'bg-primary text-primary-fg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Active
          </button>
          <button
            onClick={() => setView('archived')}
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              view === 'archived' ? 'bg-primary text-primary-fg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Archive className="h-3.5 w-3.5" /> Archived ({archived.length})
          </button>
        </div>
      )}

      {patients === null ? (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-accent-ink/50" />
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            {source.length === 0
              ? view === 'archived'
                ? 'No archived patients.'
                : 'No patients yet — add the first one to start their record.'
              : 'No patients match that search.'}
          </p>
          {view === 'active' && source.length === 0 && (
            <Link
              to="/patients/new"
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
            >
              <Plus className="h-4 w-4" /> Add patient
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface">
          {shown.map((p, i) => {
            const age = ageOf(p);
            const row = (
              <>
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-serif font-semibold ${
                    view === 'archived' ? 'bg-muted text-muted-foreground' : 'bg-primary-soft text-primary'
                  }`}
                >
                  {p.firstName.charAt(0)}
                  {p.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate font-semibold ${view === 'archived' ? 'text-muted-foreground' : ''}`}>
                      {fullName(p)}
                    </span>
                    {hasMedicalAlerts(p) && view === 'active' && (
                      <span title="Has medical alerts">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-danger" />
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                    {age !== null && <span>{age} yrs</span>}
                    {p.sex && <span className="capitalize">{p.sex}</span>}
                    {p.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {p.phone}
                      </span>
                    )}
                  </div>
                </div>
              </>
            );

            return view === 'active' ? (
              <button
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary-soft/50 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                {row}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            ) : (
              <div
                key={p.id}
                className={`flex w-full items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                {row}
                <button
                  onClick={() => onRestore(p)}
                  disabled={restoringId === p.id}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 px-3.5 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-50"
                >
                  {restoringId === p.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArchiveRestore className="h-4 w-4" />
                  )}
                  Restore
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
