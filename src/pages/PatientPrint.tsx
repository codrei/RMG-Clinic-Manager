import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Printer } from 'lucide-react';
import { ageOf, fullName, subscribePatient, type Patient } from '../lib/patients';
import { statusMeta, subscribeChart, type ChartTeeth } from '../lib/chart';
import { peso, subscribeVisits, type Visit } from '../lib/visits';

const longDate = new Intl.DateTimeFormat('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

function fmtDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return longDate.format(new Date(y, m - 1, d));
}

/** Clean, print-friendly view of one patient's full record. */
export function PatientPrint() {
  const { id } = useParams();
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);
  const [teeth, setTeeth] = useState<ChartTeeth>({});
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!id) return;
    const u1 = subscribePatient(id, setPatient);
    const u2 = subscribeChart(id, setTeeth);
    const u3 = subscribeVisits(id, setVisits);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [id]);

  if (!patient) {
    return (
      <div className="p-10 text-sm text-muted-foreground">
        {patient === undefined ? 'Loading…' : 'Record not found.'}
      </div>
    );
  }

  const age = ageOf(patient);
  const findings = Object.entries(teeth).sort(([a], [b]) => Number(a) - Number(b));
  const totalBilled = visits.reduce((s, v) => s + v.totalFee, 0);
  const totalPaid = visits.reduce((s, v) => s + v.amountPaid, 0);

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      {/* Toolbar — hidden when printing */}
      <div className="no-print mb-6 flex items-center justify-between">
        <Link
          to={`/patients/${id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to record
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Letterhead */}
      <header className="flex items-center gap-3 border-b-2 border-primary pb-4">
        <img src="/images/logo-icon.png" alt="" className="h-12 w-auto" style={{ mixBlendMode: 'multiply' }} />
        <div>
          <div className="font-serif text-xl font-bold text-primary">RMG Dental Clinic</div>
          <div className="text-xs text-muted-foreground">
            Ground Floor, Manguiat Building, General Luna Street, Lipa City, Batangas · (0917) 511-6812
          </div>
        </div>
        <div className="ml-auto text-right text-xs text-muted-foreground">
          Patient record
          <br />
          {longDate.format(new Date())}
        </div>
      </header>

      {/* Patient */}
      <section className="mt-5">
        <h1 className="font-serif text-2xl font-bold">{fullName(patient)}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {[
            age !== null ? `${age} yrs` : null,
            patient.sex || null,
            patient.birthdate ? `born ${patient.birthdate}` : null,
            patient.phone || null,
            patient.email || null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
        {patient.address && <div className="mt-0.5 text-sm text-muted-foreground">{patient.address}</div>}
      </section>

      {/* Medical alerts */}
      {(patient.allergies || patient.conditions || patient.medications || patient.medicalNotes) && (
        <section className="mt-5 rounded-lg border-2 border-danger/40 p-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-danger">Medical alerts</h2>
          <dl className="mt-2 space-y-1 text-sm">
            {patient.allergies && (
              <div><dt className="inline font-semibold">Allergies: </dt><dd className="inline">{patient.allergies}</dd></div>
            )}
            {patient.conditions && (
              <div><dt className="inline font-semibold">Conditions: </dt><dd className="inline">{patient.conditions}</dd></div>
            )}
            {patient.medications && (
              <div><dt className="inline font-semibold">Medications: </dt><dd className="inline">{patient.medications}</dd></div>
            )}
            {patient.medicalNotes && (
              <div><dt className="inline font-semibold">Notes: </dt><dd className="inline">{patient.medicalNotes}</dd></div>
            )}
          </dl>
        </section>
      )}

      {/* Dental chart findings */}
      <section className="mt-6">
        <h2 className="border-b border-border pb-1 font-serif text-lg font-bold">Dental chart findings</h2>
        {findings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No findings charted.</p>
        ) : (
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1.5 pr-3">Tooth</th>
                <th className="py-1.5 pr-3">Status</th>
                <th className="py-1.5">Note</th>
              </tr>
            </thead>
            <tbody>
              {findings.map(([num, entry]) => (
                <tr key={num} className="border-t border-border">
                  <td className="py-1.5 pr-3 font-bold tabular-nums">{num}</td>
                  <td className="py-1.5 pr-3">{statusMeta(entry.status).label}</td>
                  <td className="py-1.5 text-muted-foreground">{entry.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Visit history */}
      <section className="mt-6">
        <h2 className="border-b border-border pb-1 font-serif text-lg font-bold">Visit history</h2>
        {visits.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No visits recorded.</p>
        ) : (
          <div className="mt-2 space-y-3">
            {visits.map((v) => (
              <div key={v.id} className="break-inside-avoid border-t border-border pt-2 first:border-t-0">
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{fmtDateKey(v.date)}</span>
                  {v.totalFee > 0 && (
                    <span className="tabular-nums">
                      {peso(v.totalFee)} · paid {peso(v.amountPaid)}
                    </span>
                  )}
                </div>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {v.procedures.map((p, i) => (
                    <li key={i}>
                      {p.name}
                      {p.teeth && p.teeth.length > 0 && (
                        <span className="text-muted-foreground"> — teeth {p.teeth.join(', ')}</span>
                      )}
                      {p.fee > 0 && <span className="text-muted-foreground"> ({peso(p.fee)})</span>}
                    </li>
                  ))}
                </ul>
                {v.notes && <p className="mt-1 text-sm italic text-muted-foreground">{v.notes}</p>}
              </div>
            ))}
            {totalBilled > 0 && (
              <div className="border-t-2 border-primary pt-2 text-right text-sm font-bold tabular-nums">
                Total billed {peso(totalBilled)} · Total paid {peso(totalPaid)} · Balance{' '}
                {peso(Math.max(0, totalBilled - totalPaid))}
              </div>
            )}
          </div>
        )}
      </section>

      <footer className="mt-8 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        Generated by RMG Clinic Manager · {longDate.format(new Date())}
      </footer>
    </div>
  );
}
