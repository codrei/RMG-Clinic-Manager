import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Loader2,
  Pencil,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react';
import {
  COMMON_PROCEDURES,
  VALID_TEETH,
  createVisit,
  deleteVisit,
  outstandingOf,
  peso,
  subscribeVisits,
  updateVisit,
  type Visit,
} from '../lib/visits';
import { applyProceduresToChart } from '../lib/chart';
import { toast } from '../lib/toast';
import { ConfirmDialog } from './ConfirmDialog';

const longDate = new Intl.DateTimeFormat('en-PH', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });

function fmtDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return longDate.format(new Date(y, m - 1, d));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

interface ProcRow {
  name: string;
  teethText: string;
  fee: string;
}

const emptyRow: ProcRow = { name: '', teethText: '', fee: '' };

export function VisitLog({ patientId }: { patientId: string }) {
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [rows, setRows] = useState<ProcRow[]>([{ ...emptyRow }]);
  const [notes, setNotes] = useState('');
  const [paid, setPaid] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Visit | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => subscribeVisits(patientId, setVisits), [patientId]);

  const outstanding = useMemo(() => (visits ? outstandingOf(visits) : 0), [visits]);
  const draftTotal = useMemo(
    () => rows.reduce((s, r) => s + (parseInt(r.fee, 10) || 0), 0),
    [rows],
  );

  function startAdd() {
    setEditingId(null);
    setDate(todayKey());
    setRows([{ ...emptyRow }]);
    setNotes('');
    setPaid('');
    setError('');
    setOpen(true);
  }

  function startEdit(v: Visit) {
    setEditingId(v.id!);
    setDate(v.date);
    setRows(
      v.procedures.map((p) => ({
        name: p.name,
        teethText: (p.teeth ?? []).join(', '),
        fee: p.fee ? String(p.fee) : '',
      })),
    );
    setNotes(v.notes ?? '');
    setPaid(v.amountPaid ? String(v.amountPaid) : '');
    setError('');
    setOpen(true);
  }

  function parseRows(): { ok: boolean; procedures?: { name: string; teeth?: string[]; fee: number }[] } {
    const procedures = [];
    for (const r of rows) {
      const name = r.name.trim();
      if (!name && !r.teethText.trim() && !r.fee.trim()) continue; // skip fully empty rows
      if (!name) {
        setError('Every procedure needs a name.');
        return { ok: false };
      }
      const tokens = r.teethText.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean);
      const bad = tokens.filter((t) => !VALID_TEETH.has(t));
      if (bad.length > 0) {
        setError(`Unknown tooth number${bad.length > 1 ? 's' : ''}: ${bad.join(', ')} (use FDI numbers like 16, 21, 55).`);
        return { ok: false };
      }
      procedures.push({ name, teeth: tokens.length ? tokens : undefined, fee: parseInt(r.fee, 10) || 0 });
    }
    if (procedures.length === 0) {
      setError('Add at least one procedure.');
      return { ok: false };
    }
    return { ok: true, procedures };
  }

  async function save() {
    const parsed = parseRows();
    if (!parsed.ok || !parsed.procedures) return;
    setError('');
    setSaving(true);
    try {
      const data = {
        date,
        procedures: parsed.procedures,
        notes,
        amountPaid: parseInt(paid, 10) || 0,
      };
      if (editingId) await updateVisit(patientId, editingId, data);
      else await createVisit(patientId, data);
      // Treatments ARE the tooth's new state — reflect them on the chart.
      await applyProceduresToChart(patientId, date, parsed.procedures);
      setOpen(false);
    } catch {
      setError('Could not save the visit. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete?.id) return;
    setDeleting(true);
    try {
      await deleteVisit(patientId, pendingDelete.id);
      setPendingDelete(null);
    } catch {
      toast.error('Could not delete the visit. Check your connection and try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 whitespace-nowrap font-serif text-lg font-semibold">
          <ClipboardList className="h-4 w-4 shrink-0 text-accent-ink" /> Visit history
        </h2>
        {!open && (
          <button
            onClick={startAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> Add visit
          </button>
        )}
      </div>
      {outstanding > 0 && (
        <div className="mt-2">
          <span className="inline-block rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-bold text-warn">
            {peso(outstanding)} outstanding balance
          </span>
        </div>
      )}

      {/* Add / edit form */}
      {open && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary-soft/40 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold">{editingId ? 'Edit visit' : 'New visit'}</h3>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</div>
          )}

          <label className="mt-4 block max-w-[12rem]">
            <span className="mb-1.5 block text-sm font-semibold">Date</span>
            <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </label>

          <div className="mt-4">
            <span className="mb-1.5 block text-sm font-semibold">Procedures</span>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2 sm:border-0 sm:p-0">
                  <input
                    value={r.name}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Procedure (e.g. Tooth filling)"
                    list="common-procedures"
                    maxLength={80}
                    className={`${inputCls} w-full sm:w-auto sm:flex-1`}
                  />
                  <input
                    value={r.teethText}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, teethText: e.target.value } : x)))}
                    placeholder="Teeth: 16, 21"
                    maxLength={40}
                    className={`${inputCls} min-w-0 flex-1 sm:flex-none sm:w-32`}
                  />
                  <input
                    value={r.fee}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, fee: e.target.value.replace(/[^\d]/g, '') } : x)))}
                    placeholder="Fee ₱"
                    inputMode="numeric"
                    maxLength={7}
                    className={`${inputCls} w-24`}
                  />
                  <button
                    onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : rows)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:text-danger disabled:opacity-30"
                    disabled={rows.length === 1}
                    aria-label="Remove procedure"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <datalist id="common-procedures">
              {COMMON_PROCEDURES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <button
              onClick={() => setRows([...rows, { ...emptyRow }])}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-accent-ink hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add another procedure
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Fillings, extractions, root canals, crowns, bridges, and sealants
              with teeth listed will update the dental chart automatically.
            </p>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold">Clinical notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} placeholder="Findings, anesthesia used, follow-up plan…" className={inputCls} />
          </label>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <label className="block max-w-[10rem]">
              <span className="mb-1.5 block text-sm font-semibold">Amount paid (₱)</span>
              <input value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" maxLength={7} className={inputCls} />
            </label>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-bold text-foreground">{peso(draftTotal)}</span>
              {draftTotal > 0 && (
                <>
                  {' · '}Balance:{' '}
                  <span className={`font-bold ${draftTotal - (parseInt(paid, 10) || 0) > 0 ? 'text-warn' : 'text-ok'}`}>
                    {peso(Math.max(0, draftTotal - (parseInt(paid, 10) || 0)))}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {editingId ? 'Save changes' : 'Save visit'}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {visits === null ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading visits…
        </div>
      ) : visits.length === 0 ? (
        !open && <p className="mt-4 text-sm text-muted-foreground">No visits recorded yet — add the first one.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {visits.map((v) => {
            const balance = v.totalFee - v.amountPaid;
            return (
              <div key={v.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold">{fmtDate(v.date)}</div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        v.totalFee === 0
                          ? 'bg-muted text-muted-foreground'
                          : balance <= 0
                            ? 'bg-ok-soft text-ok'
                            : v.amountPaid > 0
                              ? 'bg-warn-soft text-warn'
                              : 'bg-danger-soft text-danger'
                      }`}
                    >
                      {v.totalFee === 0 ? 'No charge' : balance <= 0 ? 'Paid' : v.amountPaid > 0 ? `${peso(balance)} due` : 'Unpaid'}
                    </span>
                    <button onClick={() => startEdit(v)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground" aria-label="Edit visit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setPendingDelete(v)} className="rounded-lg p-1.5 text-muted-foreground hover:text-danger" aria-label="Delete visit">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <ul className="mt-2.5 space-y-1.5">
                  {v.procedures.map((p, i) => (
                    <li key={i} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="flex flex-wrap items-center gap-1.5">
                        {p.name}
                        {p.teeth?.map((t) => (
                          <span key={t} className="rounded bg-primary-soft px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-primary">
                            {t}
                          </span>
                        ))}
                      </span>
                      {p.fee > 0 && <span className="tabular-nums text-muted-foreground">{peso(p.fee)}</span>}
                    </li>
                  ))}
                </ul>

                {v.notes && (
                  <p className="mt-2.5 flex items-start gap-1.5 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-ink" />
                    <span className="whitespace-pre-wrap">{v.notes}</span>
                  </p>
                )}

                {v.totalFee > 0 && (
                  <div className="mt-2.5 border-t border-border pt-2 text-right text-sm tabular-nums text-muted-foreground">
                    Total <span className="font-semibold text-foreground">{peso(v.totalFee)}</span>
                    {' · '}Paid <span className="font-semibold text-foreground">{peso(v.amountPaid)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        icon={Trash2}
        tone="danger"
        title="Delete this visit?"
        confirmLabel="Delete visit"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete && (
          <>
            <span className="font-semibold text-foreground">{fmtDate(pendingDelete.date)}</span>
            {pendingDelete.totalFee > 0 && <> · {peso(pendingDelete.totalFee)}</>}
            <br />
            This permanently removes the visit from the history. The dental
            chart is not changed.
          </>
        )}
      </ConfirmDialog>
    </section>
  );
}

const inputCls =
  'w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
