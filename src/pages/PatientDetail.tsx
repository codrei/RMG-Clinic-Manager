import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ChevronLeft,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
} from 'lucide-react';
import { ToothChart } from '../components/ToothChart';
import { VisitLog } from '../components/VisitLog';
import {
  ageOf,
  archivePatient,
  fullName,
  hasMedicalAlerts,
  subscribePatient,
  type Patient,
} from '../lib/patients';

export function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null | undefined>(undefined);

  useEffect(() => {
    if (!id) return;
    return subscribePatient(id, setPatient);
  }, [id]);

  if (patient === undefined) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading record…
      </div>
    );
  }
  if (patient === null || patient.archived) {
    return (
      <div>
        <p className="text-muted-foreground">This patient record doesn&apos;t exist (or was archived).</p>
        <Link to="/" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline">
          <ChevronLeft className="h-4 w-4" /> Back to patients
        </Link>
      </div>
    );
  }

  const age = ageOf(patient);

  async function onArchive() {
    if (!id) return;
    if (!window.confirm(`Archive ${fullName(patient!)}'s record? It will be hidden from the list (not deleted).`)) return;
    await archivePatient(id);
    navigate('/');
  }

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Patients
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full bg-primary-soft font-serif text-xl font-semibold text-primary">
            {patient.firstName.charAt(0)}
            {patient.lastName.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{fullName(patient)}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[age !== null ? `${age} yrs` : null, patient.sex ? patient.sex : null, patient.occupation]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={`/patients/${id}/edit`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="h-4 w-4" /> Edit
          </Link>
          <button
            onClick={onArchive}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-danger/40 hover:text-danger"
          >
            <Archive className="h-4 w-4" /> Archive
          </button>
        </div>
      </div>

      {/* Medical alerts — the thing the dentist must see before treating */}
      {hasMedicalAlerts(patient) && (
        <div className="mt-6 rounded-xl border border-danger/30 bg-danger-soft p-4">
          <div className="flex items-center gap-2 font-semibold text-danger">
            <AlertTriangle className="h-4 w-4" /> Medical alerts
          </div>
          <dl className="mt-2 space-y-1 text-sm text-foreground">
            {patient.allergies?.trim() && (
              <div>
                <dt className="inline font-semibold">Allergies: </dt>
                <dd className="inline">{patient.allergies}</dd>
              </div>
            )}
            {patient.conditions?.trim() && (
              <div>
                <dt className="inline font-semibold">Conditions: </dt>
                <dd className="inline">{patient.conditions}</dd>
              </div>
            )}
            {patient.medications?.trim() && (
              <div>
                <dt className="inline font-semibold">Medications: </dt>
                <dd className="inline">{patient.medications}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Contact & details */}
        <section className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
            <User className="h-4 w-4 text-accent-ink" /> Details
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            {patient.phone && (
              <Row icon={Phone}>
                <a href={`tel:${patient.phone.replace(/[^\d+]/g, '')}`} className="font-medium text-accent-ink hover:underline">
                  {patient.phone}
                </a>
              </Row>
            )}
            {patient.email && <Row icon={Mail}>{patient.email}</Row>}
            {patient.address && <Row icon={MapPin}>{patient.address}</Row>}
            {patient.birthdate && (
              <Row icon={User}>
                Born {patient.birthdate}
              </Row>
            )}
            {(patient.emergencyName || patient.emergencyPhone) && (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emergency contact</div>
                <div className="mt-1">
                  {[patient.emergencyName, patient.emergencyPhone].filter(Boolean).join(' · ')}
                </div>
              </div>
            )}
            {patient.medicalNotes?.trim() && (
              <div className="border-t border-border pt-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Medical notes</div>
                <p className="mt-1 whitespace-pre-wrap">{patient.medicalNotes}</p>
              </div>
            )}
          </dl>
        </section>

        {/* Dental chart (odontogram) */}
        <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          {id && <ToothChart patientId={id} />}
        </section>
      </div>

      {/* Visit history & billing */}
      {id && <VisitLog patientId={id} />}
    </div>
  );
}

function Row({ icon: Icon, children }: { icon: typeof Phone; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
