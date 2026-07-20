import { doc, getDoc, onSnapshot, setDoc, deleteField, serverTimestamp } from 'firebase/firestore';
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
  /**
   * The visit that auto-charted this tooth, if any. Lets editing or deleting
   * that visit reconcile the chart. Manual edits omit it, so they're never
   * touched by visit changes.
   */
  visitId?: string;
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

/**
 * Set (or clear, with entry = null) one tooth's finding — a MANUAL edit.
 * Manual edits clear any note/visit stamp left by auto-charting, so the
 * doctor's hand-entered state is authoritative and never reverted when a
 * visit is later edited or deleted.
 */
export async function setTooth(patientId: string, tooth: string, entry: ToothEntry | null): Promise<void> {
  const ref = doc(db, 'patients', patientId, 'chart', 'current');
  const value = entry
    ? {
        status: entry.status,
        note: entry.note?.trim() ? entry.note.trim() : deleteField(),
        visitId: deleteField(),
      }
    : deleteField();
  await setDoc(ref, { teeth: { [tooth]: value }, updatedAt: serverTimestamp() }, { merge: true });
}

// ── Auto-charting from visit procedures ─────────────────────────────────
// A completed treatment IS the tooth's new state: a filling on 16 makes 16
// "filled". Keyword matching so the doctor's own phrasing still charts
// ("Composite restoration", "RCT #36"). Non-tooth procedures (cleaning,
// whitening, consult…) intentionally match nothing.

const PROCEDURE_STATUS_RULES: { pattern: RegExp; status: ToothStatus }[] = [
  { pattern: /extract/i, status: 'missing' },
  { pattern: /root\s*canal|rct|endo/i, status: 'root_canal' },
  { pattern: /crown/i, status: 'crown' },
  { pattern: /bridge|pontic/i, status: 'bridge' },
  { pattern: /sealant/i, status: 'sealant' },
  { pattern: /fill|restor|composite|amalgam/i, status: 'filling' },
];

export function statusForProcedure(name: string): ToothStatus | null {
  const rule = PROCEDURE_STATUS_RULES.find((r) => r.pattern.test(name));
  return rule ? rule.status : null;
}

const chartDate = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Reconciles a visit's tooth-changing procedures with the chart in ONE write,
 * so the chart never drifts out of sync when a visit is created, edited, or
 * deleted:
 *
 *   • Each affected tooth gets the treatment's status, an auto note like
 *     "Tooth filling — Jul 16, 2026", and this visit's id (provenance).
 *   • Teeth this visit previously charted but no longer touches are cleared
 *     (e.g. a tooth number was corrected, or the visit is being deleted).
 *   • Teeth set by hand (no visit stamp) or by OTHER visits are left alone.
 *
 * Pass procedures = [] (and dateKey = null) to remove everything this visit
 * charted — used when a visit is deleted.
 */
export async function reconcileVisitChart(
  patientId: string,
  visitId: string,
  dateKey: string | null,
  procedures: { name: string; teeth?: string[] }[],
): Promise<void> {
  const ref = doc(db, 'patients', patientId, 'chart', 'current');
  const snap = await getDoc(ref);
  const teeth = (snap.data()?.teeth as ChartTeeth | undefined) ?? {};

  // What this visit should mark on the chart now.
  const desired: Record<string, ToothEntry> = {};
  if (dateKey) {
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateLabel = chartDate.format(new Date(y, (m || 1) - 1, d || 1));
    for (const p of procedures) {
      const status = statusForProcedure(p.name);
      if (!status || !p.teeth || p.teeth.length === 0) continue;
      for (const tooth of p.teeth) {
        desired[tooth] = { status, note: `${p.name} — ${dateLabel}`, visitId };
      }
    }
  }

  const updates: Record<string, ToothEntry | ReturnType<typeof deleteField>> = {};
  // Remove marks THIS visit made before but no longer does. Manual edits and
  // other visits (different visitId, or none) are never cleared here.
  for (const [tooth, entry] of Object.entries(teeth)) {
    if (entry.visitId === visitId && !(tooth in desired)) {
      updates[tooth] = deleteField();
    }
  }
  // Apply / refresh this visit's marks.
  for (const [tooth, entry] of Object.entries(desired)) {
    updates[tooth] = entry;
  }

  if (Object.keys(updates).length === 0) return;
  await setDoc(ref, { teeth: updates, updatedAt: serverTimestamp() }, { merge: true });
}
