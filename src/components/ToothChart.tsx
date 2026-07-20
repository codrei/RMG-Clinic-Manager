import { useEffect, useMemo, useState } from 'react';
import { Baby, Eraser, Loader2, Save, Smile, User } from 'lucide-react';
import {
  ADULT_LOWER,
  ADULT_UPPER,
  PRIMARY_LOWER,
  PRIMARY_UPPER,
  STATUSES,
  setTooth,
  statusMeta,
  subscribeChart,
  toothName,
  type ChartTeeth,
  type ToothStatus,
} from '../lib/chart';
import { toast } from '../lib/toast';

type Dentition = 'adult' | 'primary';

export function ToothChart({ patientId }: { patientId: string }) {
  const [teeth, setTeeth] = useState<ChartTeeth | null>(null);
  const [dentition, setDentition] = useState<Dentition>('adult');
  const [selected, setSelected] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<ToothStatus | null>(null);
  const [draftNote, setDraftNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeChart(patientId, setTeeth), [patientId]);

  // Load the selected tooth's current entry into the editor
  useEffect(() => {
    if (!selected || !teeth) return;
    const cur = teeth[selected];
    setDraftStatus(cur?.status ?? null);
    setDraftNote(cur?.note ?? '');
  }, [selected, teeth]);

  // Desktop: one row per arch (16 teeth). Phones: one row per QUADRANT
  // (8 teeth) — the whole chart fits with no sideways scrolling.
  const rows = dentition === 'adult' ? [ADULT_UPPER, ADULT_LOWER] : [PRIMARY_UPPER, PRIMARY_LOWER];
  const mobileRows =
    dentition === 'adult'
      ? [ADULT_UPPER.slice(0, 8), ADULT_UPPER.slice(8), ADULT_LOWER.slice(0, 8), ADULT_LOWER.slice(8)]
      : [PRIMARY_UPPER, PRIMARY_LOWER];
  /** Rows belonging to the lower arch print their numbers below the tooth. */
  const isLowerRow = (rowIdx: number, total: number) => rowIdx >= total / 2;

  const summary = useMemo(() => {
    if (!teeth) return [];
    const currentSet = new Set([...rows[0], ...rows[1]]);
    const counts = new Map<ToothStatus, number>();
    Object.entries(teeth).forEach(([num, entry]) => {
      if (currentSet.has(num)) counts.set(entry.status, (counts.get(entry.status) ?? 0) + 1);
    });
    return STATUSES.filter((s) => counts.has(s.id)).map((s) => ({ ...s, count: counts.get(s.id)! }));
  }, [teeth, rows]);

  async function saveSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      await setTooth(patientId, selected, draftStatus ? { status: draftStatus, note: draftNote } : null);
      setSelected(null);
    } catch {
      toast.error('Could not save the tooth. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function clearSelected() {
    if (!selected) return;
    setSaving(true);
    try {
      await setTooth(patientId, selected, null);
      setSelected(null);
    } catch {
      toast.error('Could not update the tooth. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (teeth === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading chart…
      </div>
    );
  }

  return (
    <div>
      {/* Header row: title + dentition toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Smile className="h-4 w-4 text-accent-ink" /> Dental chart
        </h2>
        <div className="flex rounded-lg border border-border p-0.5">
          {(
            [
              { id: 'adult', label: 'Adult', icon: User },
              { id: 'primary', label: 'Child', icon: Baby },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setDentition(t.id);
                setSelected(null);
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                dentition === t.id ? 'bg-primary text-primary-fg' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* The chart — phones get quadrant rows (no sideways scroll), desktop gets full arches */}
      {(() => {
        const renderRow = (row: string[], labelBelow: boolean, midlineAt: number | null, topBorder: boolean) => (
          <div className={`flex justify-center gap-1 ${topBorder ? 'mt-3 border-t border-dashed border-border pt-3' : 'mt-1.5'}`}>
            {row.map((num, i) => {
              const entry = teeth[num];
              const meta = entry ? statusMeta(entry.status) : null;
              const midline = midlineAt !== null && i === midlineAt;
              const isSel = selected === num;
              return (
                <div key={num} className={`flex flex-col items-center ${midline ? 'ml-2.5 border-l border-dashed border-border pl-2.5' : ''}`}>
                  {!labelBelow && <span className="mb-1 text-[10px] font-semibold tabular-nums text-muted-foreground">{num}</span>}
                  <button
                    onClick={() => setSelected(isSel ? null : num)}
                    title={`${num} — ${toothName(num)}${entry ? ` · ${meta!.label}` : ''}`}
                    className={`grid h-9 w-8 place-items-center rounded-md border text-[10px] font-bold transition-all sm:w-7 ${
                      meta ? meta.chip : 'border-border bg-surface text-transparent hover:border-primary'
                    } ${isSel ? 'ring-2 ring-primary ring-offset-2' : ''} ${entry?.note ? 'shadow-[0_2px_0_0_var(--accent)]' : ''}`}
                  >
                    {meta ? meta.code : '·'}
                  </button>
                  {labelBelow && <span className="mt-1 text-[10px] font-semibold tabular-nums text-muted-foreground">{num}</span>}
                </div>
              );
            })}
          </div>
        );

        return (
          <>
            {/* Phones: one quadrant per row — everything visible at once */}
            <div className="mt-3 sm:hidden">
              {mobileRows.map((row, i) =>
                renderRow(
                  row,
                  isLowerRow(i, mobileRows.length),
                  dentition === 'primary' ? row.length / 2 : null,
                  i === mobileRows.length / 2,
                ),
              )}
            </div>
            {/* Desktop: classic two-arch chart */}
            <div className="mt-4 hidden sm:block">
              {rows.map((row, i) => renderRow(row, i === 1, row.length / 2, i === 1))}
            </div>
          </>
        );
      })()}

      {/* Summary of findings */}
      {summary.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {summary.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium">
              <span className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${s.chip}`}>{s.code}</span>
              {s.count} {s.label.toLowerCase()}
            </span>
          ))}
        </div>
      )}

      {/* Tooth editor */}
      {selected && (
        <div className="mt-5 rounded-xl border border-primary/30 bg-primary-soft/40 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <span className="font-serif text-lg font-semibold">Tooth {selected}</span>
              <span className="ml-2 text-sm text-muted-foreground">{toothName(selected)}</span>
            </div>
            {teeth[selected] && (
              <button
                onClick={clearSelected}
                disabled={saving}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-danger"
              >
                <Eraser className="h-3.5 w-3.5" /> Mark healthy
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s.id}
                onClick={() => setDraftStatus(draftStatus === s.id ? null : s.id)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                  draftStatus === s.id ? 'border-primary bg-surface ring-2 ring-primary/40' : 'border-border bg-surface hover:border-primary'
                }`}
              >
                <span className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${s.chip}`}>{s.code}</span>
                {s.label}
              </button>
            ))}
          </div>

          <textarea
            value={draftNote}
            onChange={(e) => setDraftNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="Note for this tooth (e.g. mesial surface, done 2024, monitor)"
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={saveSelected}
              disabled={saving || (!draftStatus && !teeth[selected])}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save tooth
            </button>
            <button
              onClick={() => setSelected(null)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold hover:text-foreground">Legend</summary>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
          {STATUSES.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span className={`grid h-4 w-4 place-items-center rounded text-[9px] font-bold ${s.chip}`}>{s.code}</span>
              {s.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-4 w-4 rounded border border-border bg-surface shadow-[0_2px_0_0_var(--accent)]" />
            has a note (sky underline)
          </span>
        </div>
      </details>
    </div>
  );
}
