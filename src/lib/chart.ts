import { doc, onSnapshot, setDoc, deleteField, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Dental chart (odontogram), FDI two-digit notation.
 * Stored as ONE doc per patient: patients/{id}/chart/current
 *   { teeth: { "16": { status, note? }, ... }, updatedAt }
 * Adult (11–48) and primary (51–85) numbers coexist, so a child's chart
 * can hold both during mixed dentition.
 */

export type ToothStatus =
  | 'decay'
  | 'filling'
  | 'missing'
  | 'root_canal'
  | 'crown'
  | 'bridge'
  | 'impacted'
  | 'for_extraction'
  | 'sealant';

export interface ToothEntry {
  status: ToothStatus;
  note?: string;
}

export type ChartTeeth = Record<string, ToothEntry>;

export interface StatusMeta {
  id: ToothStatus;
  label: string;
  /** chip / tooth fill classes */
  chip: string;
  /** short code shown inside the tooth */
  code: string;
}

/** Charting convention: pathology red-ish, existing restorations blue-ish. */
export const STATUSES: StatusMeta[] = [
  { id: 'decay', label: 'Decay (caries)', chip: 'bg-red-600 text-white', code: 'C' },
  { id: 'filling', label: 'Filling / restored', chip: 'bg-blue-600 text-white', code: 'F' },
  { id: 'missing', label: 'Missing / extracted', chip: 'bg-slate-500 text-white', code: 'X' },
  { id: 'root_canal', label: 'Root canal treated', chip: 'bg-purple-600 text-white', code: 'RC' },
  { id: 'crown', label: 'Crown', chip: 'bg-amber-500 text-white', code: 'Cr' },
  { id: 'bridge', label: 'Bridge / pontic', chip: 'bg-teal-600 text-white', code: 'Br' },
  { id: 'impacted', label: 'Impacted', chip: 'bg-orange-500 text-white', code: 'Im' },
  { id: 'for_extraction', label: 'For extraction', chip: 'bg-red-100 text-red-700 border border-red-600 border-dashed', code: 'Ex' },
  { id: 'sealant', label: 'Sealant', chip: 'bg-emerald-600 text-white', code: 'S' },
];

export const statusMeta = (s: ToothStatus): StatusMeta => STATUSES.find((m) => m.id === s)!;

// ── FDI layouts (left→right as the DENTIST views the chart) ─────────────
export const ADULT_UPPER = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
export const ADULT_LOWER = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];
export const PRIMARY_UPPER = ['55', '54', '53', '52', '51', '61', '62', '63', '64', '65'];
export const PRIMARY_LOWER = ['85', '84', '83', '82', '81', '71', '72', '73', '74', '75'];

const QUADRANTS: Record<string, string> = {
  '1': 'Upper right',
  '2': 'Upper left',
  '3': 'Lower left',
  '4': 'Lower right',
  '5': 'Upper right',
  '6': 'Upper left',
  '7': 'Lower left',
  '8': 'Lower right',
};

const ADULT_POS = ['central incisor', 'lateral incisor', 'canine', 'first premolar', 'second premolar', 'first molar', 'second molar', 'third molar'];
const PRIMARY_POS = ['central incisor', 'lateral incisor', 'canine', 'first molar', 'second molar'];

export function toothName(fdi: string): string {
  const q = fdi.charAt(0);
  const pos = Number(fdi.charAt(1));
  const isPrimary = Number(q) >= 5;
  const names = isPrimary ? PRIMARY_POS : ADULT_POS;
  const name = names[pos - 1] ?? '';
  return `${QUADRANTS[q] ?? ''} ${name}${isPrimary ? ' (primary)' : ''}`.trim();
}

export function subscribeChart(patientId: string, cb: (teeth: ChartTeeth) => void): () => void {
  return onSnapshot(doc(db, 'patients', patientId, 'chart', 'current'), (snap) => {
    cb((snap.data()?.teeth as ChartTeeth | undefined) ?? {});
  });
}

/** Set (or clear, with entry = null) one tooth's finding. */
export async function setTooth(patientId: string, tooth: string, entry: ToothEntry | null): Promise<void> {
  const ref = doc(db, 'patients', patientId, 'chart', 'current');
  const value = entry
    ? entry.note?.trim()
      ? { status: entry.status, note: entry.note.trim() }
      : { status: entry.status }
    : deleteField();
  await setDoc(ref, { teeth: { [tooth]: value }, updatedAt: serverTimestamp() }, { merge: true });
}
