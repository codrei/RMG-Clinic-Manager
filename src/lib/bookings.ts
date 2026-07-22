import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { Patient } from './patients';

/**
 * Read-side of the booking website's appointments (same Firebase project,
 * same `bookings` collection — the shared rules let the clinic login read).
 */
export interface Booking {
  id: string;
  serviceName: string;
  /** "2026-07-16" */
  date: string;
  /** "09:00" */
  time: string;
  patientName: string;
  phone: string;
  email?: string;
  notes?: string;
  // Intake details the booking form collects (newer bookings only) — used
  // to prefill a complete patient record via "Add as patient".
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthdate?: string;
  sex?: 'male' | 'female';
  occupation?: string;
  address?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  allergies?: string;
  conditions?: string;
  medications?: string;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

/** "09:00" -> "9:00 AM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

/** Today's actionable bookings (confirmed + pending), earliest first. */
export function subscribeTodayBookings(cb: (list: Booking[]) => void): () => void {
  const q = query(collection(db, 'bookings'), where('date', '==', todayKey()));
  return onSnapshot(q, (snap) => {
    const list = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<Booking, 'id'>) }))
      .filter((b) => b.status === 'confirmed' || b.status === 'pending');
    list.sort((a, b) => a.time.localeCompare(b.time));
    cb(list);
  });
}

const digitsOf = (s: string) => s.replace(/[^\d]/g, '');

/**
 * Finds the existing patient a booking belongs to. Phone number is the
 * primary key (people's spelling of their own name varies); exact
 * full-name match is the fallback.
 */
export function matchPatient(booking: Booking, patients: Patient[]): Patient | null {
  const bDigits = digitsOf(booking.phone);
  if (bDigits.length >= 10) {
    const byPhone = patients.find((p) => !p.archived && p.phone && digitsOf(p.phone) === bDigits);
    if (byPhone) return byPhone;
  }
  const bName = booking.patientName.trim().toLowerCase().replace(/\s+/g, ' ');
  const byName = patients.find(
    (p) =>
      !p.archived &&
      `${p.firstName} ${p.lastName}`.trim().toLowerCase().replace(/\s+/g, ' ') === bName,
  );
  return byName ?? null;
}

/** Splits a booking's free-text name into form-ready parts. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length <= 1) return { firstName: tokens[0] ?? '', lastName: '' };
  return { firstName: tokens.slice(0, -1).join(' '), lastName: tokens[tokens.length - 1] };
}
