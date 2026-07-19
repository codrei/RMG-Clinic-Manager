import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2, Phone, Plus, Search, Users } from 'lucide-react';
import {
  ageOf,
  fullName,
  hasMedicalAlerts,
  matchesSearch,
  subscribePatients,
  type Patient,
} from '../lib/patients';

export function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [term, setTerm] = useState('');

  useEffect(() => subscribePatients(setPatients), []);

  const shown = useMemo(
    () => (patients ?? []).filter((p) => matchesSearch(p, term)),
    [patients, term],
  );

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Patients</h1>
          {patients && (
            <p className="mt-1 text-sm text-muted-foreground">
              {patients.length} {patients.length === 1 ? 'patient' : 'patients'} on record
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search name, phone, email"
              className="w-64 rounded-lg border border-border bg-surface py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <Link
            to="/patients/new"
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add patient
          </Link>
        </div>
      </div>

      {patients === null ? (
        <div className="mt-12 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading patients…
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-accent-ink/50" />
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            {patients.length === 0
              ? 'No patients yet — add the first one to start their record.'
              : 'No patients match that search.'}
          </p>
          {patients.length === 0 && (
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
            return (
              <button
                key={p.id}
                onClick={() => navigate(`/patients/${p.id}`)}
                className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary-soft/50 ${
                  i > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft font-serif font-semibold text-primary">
                  {p.firstName.charAt(0)}
                  {p.lastName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">{fullName(p)}</span>
                    {hasMedicalAlerts(p) && (
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
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
