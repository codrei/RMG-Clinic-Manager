import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Patient {
  id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  sex?: 'male' | 'female' | '';
  /** "1990-05-21" */
  birthdate?: string;
  phone: string;
  email?: string;
  address?: string;
  occupation?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  /** Free text — anything non-empty appears in the red alerts banner. */
  allergies?: string;
  conditions?: string;
  medications?: string;
  medicalNotes?: string;
  /** Soft delete: archived patients disappear from lists but are never destroyed. */
  archived: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export function fullName(p: Patient): string {
  return [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
}

export function ageOf(p: Patient): number | null {
  if (!p.birthdate) return null;
  const [y, m, d] = p.birthdate.split('-').map(Number);
  if (!y) return null;
  const b = new Date(y, (m || 1) - 1, d || 1);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

export function hasMedicalAlerts(p: Patient): boolean {
  return Boolean(p.allergies?.trim() || p.conditions?.trim() || p.medications?.trim());
}

/**
 * Live list of active patients. A solo clinic's whole registry is a few
 * MB at most, so we subscribe to all of it and search client-side —
 * instant results, works offline, no server-side index gymnastics.
 */
export function subscribePatients(cb: (list: Patient[]) => void): () => void {
  return onSnapshot(collection(db, 'patients'), (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Patient, 'id'>) }))
      .filter((p) => !p.archived);
    list.sort((a, b) => fullName(a).localeCompare(fullName(b)));
    cb(list);
  });
}

export function subscribePatient(id: string, cb: (p: Patient | null) => void): () => void {
  return onSnapshot(doc(db, 'patients', id), (snap) => {
    cb(snap.exists() ? ({ id: snap.id, ...(snap.data() as Omit<Patient, 'id'>) }) : null);
  });
}

export function matchesSearch(p: Patient, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return (
    fullName(p).toLowerCase().includes(t) ||
    (p.phone ?? '').replace(/\s/g, '').includes(t.replace(/\s/g, '')) ||
    (p.email ?? '').toLowerCase().includes(t)
  );
}

type PatientInput = Omit<Patient, 'id' | 'archived' | 'createdAt' | 'updatedAt'>;

/** Strips empty optional fields so Firestore stays tidy. */
function compact(data: PatientInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  Object.entries(data).forEach(([k, v]) => {
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (trimmed) out[k] = trimmed;
    } else if (v !== undefined && v !== null) {
      out[k] = v;
    }
  });
  return out;
}

export async function createPatient(data: PatientInput): Promise<string> {
  const ref = await addDoc(collection(db, 'patients'), {
    ...compact(data),
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePatient(id: string, data: PatientInput): Promise<void> {
  // Write empty strings for cleared fields so edits can erase old values.
  const all: Record<string, unknown> = {};
  Object.entries(data).forEach(([k, v]) => {
    all[k] = typeof v === 'string' ? v.trim() : v;
  });
  await updateDoc(doc(db, 'patients', id), { ...all, updatedAt: serverTimestamp() });
}

export async function archivePatient(id: string): Promise<void> {
  await updateDoc(doc(db, 'patients', id), { archived: true, updatedAt: serverTimestamp() });
}
