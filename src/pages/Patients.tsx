import { Users } from 'lucide-react';

/** Part 2 replaces this with the real patient registry. */
export function Patients() {
  return (
    <div>
      <h1 className="text-3xl font-semibold">Patients</h1>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <Users className="mx-auto h-10 w-10 text-accent-ink/50" />
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          The patient registry is coming next — add patients, search them, and
          open their records and dental charts from here.
        </p>
      </div>
    </div>
  );
}
