import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { ADULT_LOWER, ADULT_UPPER, PRIMARY_LOWER, PRIMARY_UPPER } from './chart';

export interface Procedure {
  name: string;
  /** FDI tooth numbers this procedure touched (optional). */
  teeth?: string[];
  fee: number;
}

export interface Visit {
  id?: string;
  /** "2026-07-16" */
  date: string;
  procedures: Procedure[];
  notes?: string;
  totalFee: number;
  amountPaid: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export const VALID_TEETH: ReadonlySet<string> = new Set([
  ...ADULT_UPPER,
  ...ADULT_LOWER,
  ...PRIMARY_UPPER,
  ...PRIMARY_LOWER,
]);

/** Common procedures offered as suggestions while typing. */
export const COMMON_PROCEDURES = [
  'Consultation & check-up',
  'Oral prophylaxis (cleaning)',
  'Tooth filling / restoration',
  'Tooth extraction',
  'Root canal treatment',
  'Crown placement',
  'Braces adjustment',
  'Braces installation',
  'Teeth whitening',
  'Denture fitting',
  'X-ray',
  'Fluoride treatment',
  'Sealant',
];

export function peso(n: number): string {
  return `₱${n.toLocaleString('en-PH')}`;
}

export function visitTotal(procedures: Procedure[]): number {
  return procedures.reduce((sum, p) => sum + (Number.isFinite(p.fee) ? p.fee : 0), 0);
}

export function outstandingOf(visits: Visit[]): number {
  return visits.reduce((sum, v) => sum + Math.max(0, v.totalFee - v.amountPaid), 0);
}

export function subscribeVisits(patientId: string, cb: (visits: Visit[]) => void): () => void {
  return onSnapshot(collection(db, 'patients', patientId, 'visits'), (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Visit, 'id'>) }));
    // Newest first; same-day visits fall back to creation order.
    list.sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0);
    });
    cb(list);
  });
}

type VisitInput = Omit<Visit, 'id' | 'createdAt' | 'updatedAt' | 'totalFee'>;

function payload(data: VisitInput) {
  const procedures = data.procedures.map((p) => {
    const out: Procedure = { name: p.name.trim(), fee: Math.max(0, Math.round(p.fee || 0)) };
    if (p.teeth && p.teeth.length > 0) out.teeth = p.teeth;
    return out;
  });
  const base: Record<string, unknown> = {
    date: data.date,
    procedures,
    totalFee: visitTotal(procedures),
    amountPaid: Math.max(0, Math.round(data.amountPaid || 0)),
  };
  const notes = data.notes?.trim();
  if (notes) base.notes = notes;
  return base;
}

export async function createVisit(patientId: string, data: VisitInput): Promise<string> {
  const ref = await addDoc(collection(db, 'patients', patientId, 'visits'), {
    ...payload(data),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateVisit(patientId: string, visitId: string, data: VisitInput): Promise<void> {
  await updateDoc(doc(db, 'patients', patientId, 'visits', visitId), {
    ...payload(data),
    notes: data.notes?.trim() ?? '',
    updatedAt: serverTimestamp(),
  });
}

export async function deleteVisit(patientId: string, visitId: string): Promise<void> {
  await deleteDoc(doc(db, 'patients', patientId, 'visits', visitId));
}
