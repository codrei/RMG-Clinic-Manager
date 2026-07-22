import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  ClipboardList,
  Loader2,
  Phone,
  StickyNote,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import {
  formatTime,
  matchPatient,
  splitName,
  subscribeTodayBookings,
  type Booking,
} from '../lib/bookings';
import { subscribePatients, type Patient } from '../lib/patients';

const longDate = new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' });

export function Today() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => subscribeTodayBookings(setBookings), []);
  useEffect(() => subscribePatients(setPatients), []);

  const rows = useMemo(
    () => (bookings ?? []).map((b) => ({ booking: b, patient: matchPatient(b, patients) })),
    [bookings, patients],
  );

  function addAsPatient(b: Booking) {
    // Newer bookings carry the full intake form; older ones only a free-text
    // name, which we split as a best effort.
    const name = b.firstName && b.lastName
      ? { firstName: b.firstName, lastName: b.lastName }
      : splitName(b.patientName);
    navigate('/patients/new', {
      state: {
        prefill: {
          ...name,
          middleName: b.middleName ?? '',
          birthdate: b.birthdate ?? '',
          sex: b.sex ?? '',
          occupation: b.occupation ?? '',
          phone: b.phone,
          email: b.email ?? '',
          address: b.address ?? '',
          emergencyName: b.emergencyName ?? '',
          emergencyPhone: b.emergencyPhone ?? '',
        },
      },
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold">Today</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {longDate.format(new Date())} — appointments from the booking site.
      </p>

      {bookings === null ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading today&apos;s appointments…
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <CalendarDays className="mx-auto h-10 w-10 text-accent-ink/50" />
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            No appointments booked for today. New bookings appear here the
            moment patients make them.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map(({ booking: b, patient }) => (
            <div key={b.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-14 shrink-0 place-items-center rounded-lg bg-primary-soft text-center">
                    <span className="text-sm font-bold leading-tight text-primary">{formatTime(b.time)}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{b.patientName}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          b.status === 'confirmed' ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'
                        }`}
                      >
                        {b.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </span>
                      {patient && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-bold text-accent-ink">
                          <UserCheck className="h-3 w-3" /> On record
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                      <span>{b.serviceName}</span>
                      <a
                        href={`tel:${b.phone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 font-medium text-accent-ink hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" /> {b.phone}
                      </a>
                    </div>
                    {b.notes && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
                        <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" /> {b.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  {patient ? (
                    <button
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                    >
                      <ClipboardList className="h-4 w-4" /> Open record
                    </button>
                  ) : (
                    <button
                      onClick={() => addAsPatient(b)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                    >
                      <UserPlus className="h-4 w-4" /> Add as patient
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
