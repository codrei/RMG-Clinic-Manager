# 🦷 RMG Clinic Manager — Patient Records & Dental Charting

Private practice-management app built for a real dental clinic in Lipa City,
Batangas — the back-office companion to the public
[booking website](https://github.com/codrei/RMG-Dental-Clinic). The entire
app sits behind the clinic's login; there are no public pages.

## ✨ What it does

- **Patient registry** — add, search (name/phone/email), and edit patients;
  soft-delete archiving with one-tap restore. Allergies, conditions, and
  medications surface as a **red medical-alerts banner** the dentist can't
  miss.
- **Interactive dental chart (odontogram)** — FDI two-digit notation, full
  adult arches (11–48) with a toggle to the 20-tooth primary chart for
  children. Nine color-coded findings following real charting convention
  (pathology red, restorations blue), per-tooth notes, findings summary,
  legend.
- **Visit log** — per-visit procedures linked to specific teeth, clinical
  notes, fees with paid/balance tracking and an outstanding-balance badge.
  **Tooth-changing procedures auto-update the chart** (a filling on 16
  charts 16 as filled, with an auto note of what and when).
- **Today** — the day's appointments stream in live from the booking site
  (same Firebase project). Bookings are matched to patients by phone; one
  tap opens the record or creates a prefilled patient.
- **Print / export** — printable patient record (letterhead, alerts, chart
  findings, visit history) for referrals or paper files; registry CSV for
  spreadsheets; full JSON backup (patients + charts + visits) because the
  clinic's data belongs to the clinic.
- **Offline-tolerant** — Firestore persistent cache: WiFi drops mid-consult
  don't lose work; changes sync when the connection returns.

## 🏗️ Architecture

```
[React SPA (Vite + Tailwind v4)]      ← Vercel, login-gated, noindex
   │
   ├─ Firebase Auth (clinic account — same login as the booking dashboard)
   │
   └─ Firestore (shared project with the booking site)
        patients/{id}                  demographics + medical history
        patients/{id}/chart/current    odontogram (one doc, merge-updated)
        patients/{id}/visits/{id}      procedures · notes · fees
        bookings                       read-only view for the Today tab
```

Security: every patient-record path is locked to the authenticated clinic
account by the shared Firestore rules (`firestore.rules`, one source of
truth kept identical in both repos). No server of our own; rules are
enforced by Google's infrastructure.

## 🛠️ Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · React Router ·
Firebase (Auth + Firestore with persistent cache) · Vercel

## 🚀 Run locally

```bash
npm install
cp .env.example .env.local   # Firebase web config (same project as the booking site)
npm run dev
```

## 🔐 Deployment

Push to `main` → Vercel builds. Set the six `VITE_FIREBASE_*` env vars and
add the deployed domain to Firebase Auth → Authorized domains.

## 👤 Author

**Marco Andrei R. Belen** — Computer Science (Machine Learning) student, NU Lipa

[Portfolio](https://marcobelen.vercel.app) · [GitHub](https://github.com/codrei) · [LinkedIn](https://www.linkedin.com/in/marco-andrei-belen/)
