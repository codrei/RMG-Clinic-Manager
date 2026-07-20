import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { Patient } from './patients';

const LAST_BACKUP_KEY = 'rmg:lastBackup';

/** When a full backup last succeeded on this device, and how long ago. */
export function getBackupStatus(): { lastBackup: Date | null; daysSince: number | null } {
  try {
    const raw = localStorage.getItem(LAST_BACKUP_KEY);
    if (!raw) return { lastBackup: null, daysSince: null };
    const lastBackup = new Date(raw);
    if (Number.isNaN(lastBackup.getTime())) return { lastBackup: null, daysSince: null };
    const daysSince = Math.floor((Date.now() - lastBackup.getTime()) / 86_400_000);
    return { lastBackup, daysSince };
  } catch {
    return { lastBackup: null, daysSince: null };
  }
}

function markBackupDone() {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
  } catch {
    // Private-mode / storage-blocked: the download still worked, just skip the stamp.
  }
}

/** Triggers a browser download of generated content. */
function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

const esc = (v: unknown): string => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const CSV_COLUMNS: (keyof Patient)[] = [
  'lastName',
  'firstName',
  'middleName',
  'sex',
  'birthdate',
  'phone',
  'email',
  'address',
  'occupation',
  'emergencyName',
  'emergencyPhone',
  'allergies',
  'conditions',
  'medications',
  'medicalNotes',
  'archived',
];

/** Spreadsheet-friendly export of the whole registry (active + archived). */
export function exportPatientsCsv(patients: Patient[]) {
  const header = CSV_COLUMNS.join(',');
  const rows = patients.map((p) => CSV_COLUMNS.map((c) => esc(p[c])).join(','));
  // ﻿ BOM so Excel opens UTF-8 (ñ, é…) correctly.
  download(`rmg-patients-${stamp()}.csv`, '﻿' + [header, ...rows].join('\n'), 'text/csv;charset=utf-8');
}

/**
 * Complete backup: every patient with their dental chart and full visit
 * history, as JSON. The clinic's data belongs to the clinic — this is
 * their copy of everything.
 */
export async function exportFullBackup(patients: Patient[]) {
  const full = await Promise.all(
    patients.map(async (p) => {
      const [chartSnap, visitsSnap] = await Promise.all([
        getDoc(doc(db, 'patients', p.id!, 'chart', 'current')),
        getDocs(collection(db, 'patients', p.id!, 'visits')),
      ]);
      return {
        ...p,
        createdAt: p.createdAt?.toDate?.().toISOString() ?? null,
        updatedAt: p.updatedAt?.toDate?.().toISOString() ?? null,
        chart: chartSnap.data()?.teeth ?? {},
        visits: visitsSnap.docs.map((v) => {
          const data = v.data();
          return {
            id: v.id,
            date: data.date,
            procedures: data.procedures,
            notes: data.notes ?? '',
            totalFee: data.totalFee,
            amountPaid: data.amountPaid,
          };
        }),
      };
    }),
  );

  const payload = {
    exportedAt: new Date().toISOString(),
    clinic: 'RMG Dental Clinic',
    patientCount: full.length,
    patients: full,
  };
  download(`rmg-clinic-backup-${stamp()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  markBackupDone();
}
