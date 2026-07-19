import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ChevronLeft, HeartPulse, Loader2, Save } from 'lucide-react';
import {
  createPatient,
  subscribePatient,
  updatePatient,
  type Patient,
} from '../lib/patients';

const empty = {
  firstName: '',
  lastName: '',
  middleName: '',
  sex: '' as Patient['sex'],
  birthdate: '',
  phone: '',
  email: '',
  address: '',
  occupation: '',
  emergencyName: '',
  emergencyPhone: '',
  allergies: '',
  conditions: '',
  medications: '',
  medicalNotes: '',
};

type FormState = typeof empty;

export function PatientForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(empty);
  const [loaded, setLoaded] = useState(!editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prefill when editing
  useEffect(() => {
    if (!id) return;
    const un = subscribePatient(id, (p) => {
      if (p) {
        setForm({ ...empty, ...Object.fromEntries(Object.entries(p).filter(([k]) => k in empty)) } as FormState);
      }
      setLoaded(true);
      un(); // one read is enough for a form prefill
    });
    return un;
  }, [id]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (form.firstName.trim().length < 1 || form.lastName.trim().length < 1) {
      return setError('First and last name are required.');
    }
    const digits = form.phone.replace(/[^\d]/g, '');
    if (form.phone && !/^09\d{9}$/.test(digits)) {
      return setError('Mobile number should be 11 digits starting with 09 (or leave it blank).');
    }
    setError('');
    setSaving(true);
    try {
      if (editing && id) {
        await updatePatient(id, form);
        navigate(`/patients/${id}`);
      } else {
        const newId = await createPatient(form);
        navigate(`/patients/${newId}`);
      }
    } catch {
      setError('Could not save. Check your connection and try again.');
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={editing ? `/patients/${id}` : '/'}
        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> {editing ? 'Back to record' : 'Back to patients'}
      </Link>

      <h1 className="mt-3 text-3xl font-semibold">{editing ? 'Edit patient' : 'New patient'}</h1>

      {error && (
        <div className="mt-5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-8">
        <Section title="Personal">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name *">
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} maxLength={60} className={inputCls} />
            </Field>
            <Field label="Last name *">
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} maxLength={60} className={inputCls} />
            </Field>
            <Field label="Middle name">
              <input value={form.middleName} onChange={(e) => set('middleName', e.target.value)} maxLength={60} className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sex">
                <select value={form.sex} onChange={(e) => set('sex', e.target.value as FormState['sex'])} className={inputCls}>
                  <option value="">—</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </Field>
              <Field label="Birthdate">
                <input type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Occupation">
              <input value={form.occupation} onChange={(e) => set('occupation', e.target.value)} maxLength={80} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number">
              <input
                value={form.phone}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 11);
                  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)].filter(Boolean);
                  set('phone', parts.join(' '));
                }}
                placeholder="0917 123 4567"
                inputMode="numeric"
                maxLength={13}
                className={inputCls}
              />
            </Field>
            <Field label="Email">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={100} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address">
                <input value={form.address} onChange={(e) => set('address', e.target.value)} maxLength={200} className={inputCls} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Emergency contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input value={form.emergencyName} onChange={(e) => set('emergencyName', e.target.value)} maxLength={80} className={inputCls} />
            </Field>
            <Field label="Phone">
              <input value={form.emergencyPhone} onChange={(e) => set('emergencyPhone', e.target.value)} maxLength={20} className={inputCls} />
            </Field>
          </div>
        </Section>

        <Section
          title="Medical history"
          icon={<HeartPulse className="h-4 w-4 text-danger" />}
          hint="Anything entered here shows as a red alert on the patient's record."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Allergies">
              <input value={form.allergies} onChange={(e) => set('allergies', e.target.value)} placeholder="e.g. penicillin, latex" maxLength={200} className={inputCls} />
            </Field>
            <Field label="Medical conditions">
              <input value={form.conditions} onChange={(e) => set('conditions', e.target.value)} placeholder="e.g. hypertension, diabetes" maxLength={200} className={inputCls} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Current medications">
                <input value={form.medications} onChange={(e) => set('medications', e.target.value)} placeholder="e.g. losartan 50mg daily" maxLength={200} className={inputCls} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Other medical notes">
                <textarea value={form.medicalNotes} onChange={(e) => set('medicalNotes', e.target.value)} rows={3} maxLength={1000} className={inputCls} />
              </Field>
            </div>
          </div>
        </Section>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? 'Save changes' : 'Add patient'}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: ReactNode;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
        {icon}
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
