import { CalendarDays } from 'lucide-react';

/** Part 5 replaces this with today's confirmed bookings from the booking site. */
export function Today() {
  return (
    <div>
      <h1 className="text-3xl font-semibold">Today</h1>
      <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
        <CalendarDays className="mx-auto h-10 w-10 text-accent-ink/50" />
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Today&apos;s confirmed appointments from the booking site will appear
          here, ready to open as patient visits.
        </p>
      </div>
    </div>
  );
}
