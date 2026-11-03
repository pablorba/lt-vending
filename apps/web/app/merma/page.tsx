'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/utils';

interface Machine {
  id: string;
  name: string;
}

interface MachineDetail {
  id: string;
  slots: Array<{
    id: string;
    code: string;
    items: Array<{ productId: string; currentQty: number; product: { name: string } }>;
  }>;
}

interface Report {
  totals: { units: number; cost: number };
  byReason: Array<{ reason: string; units: number }>;
  products: Array<{ productId: string; name: string; units: number; cost: number }>;
  entries: Array<{
    id: string;
    createdAt: string;
    productName: string;
    slotCode: string | null;
    quantity: number;
    reason: string;
    cost: number;
    notes: string | null;
    userName: string;
  }>;
}

type RangeKey = '7d' | '30d' | 'month' | '90d';
const RANGES: { k: RangeKey; label: string }[] = [
  { k: '7d', label: '7 días' },
  { k: '30d', label: '30 días' },
  { k: 'month', label: 'Este mes' },
  { k: '90d', label: '90 días' },
];

const REASONS: Record<string, string> = {
  JAMMED: 'Atorado',
  EXPIRED: 'Caducado',
  DAMAGED: 'Dañado',
  THEFT: 'Robo',
  OTHER: 'Otro',
};

function buildRange(k: RangeKey) {
  const to = new Date();
  to.setHours(24, 0, 0, 0);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (k === '7d') from.setDate(from.getDate() - 6);
  else if (k === '30d') from.setDate(from.getDate() - 29);
  else if (k === '90d') from.setDate(from.getDate() - 89);
  else from.setDate(1);
  return { from, to };
}

export default function MermaPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [formMachine, setFormMachine] = useState('');
  const [detail, setDetail] = useState<MachineDetail | null>(null);
  const [slotId, setSlotId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('EXPIRED');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { from, to } = useMemo(() => buildRange(range), [range]);

  const load = useCallback(async () => {
    const qs = `from=${from.toISOString()}&to=${to.toISOString()}`;
    setReport(await apiFetch<Report>(`/merma?${qs}`));
  }, [from, to]);

  useEffect(() => {
    apiFetch<Machine[]>('/machines')
      .then((ms) => {
        setMachines(ms);
        if (ms.length) setFormMachine(ms[0].id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (machines.length) load();
  }, [machines, load]);

  useEffect(() => {
    if (!formMachine) return;
    apiFetch<MachineDetail>(`/machines/${formMachine}`)
      .then((d) => {
        setDetail(d);
        setSlotId('');
        setProductId('');
      })
      .catch(() => setDetail(null));
  }, [formMachine]);

  const slot = detail?.slots.find((s) => s.id === slotId) ?? null;

  async function register() {
    const n = parseInt(qty, 10);
    if (!slotId || !productId || !(n > 0)) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch('/waste', {
        method: 'POST',
        body: { machineId: formMachine, slotId, productId, quantity: n, reason, notes: notes.trim() || undefined },
      });
      setMsg('Merma registrada. Se descontó del espiral.');
      setQty('1');
      setNotes('');
      await load();
      setDetail(await apiFetch<MachineDetail>(`/machines/${formMachine}`));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppShell><div className="p-6 text-ash-ink">Cargando…</div></AppShell>;
  if (!machines.length) {
    return (
      <AppShell>
        <div className="p-6 text-center">
          <p className="text-ash-ink mb-4">No hay máquinas registradas.</p>
          <Link href="/maquinas" className="btn-primary">
            Agregar máquina
          </Link>
        </div>
      </AppShell>
    );
  }

  const t = report?.totals;

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-display font-medium text-ink mb-1">Merma</h1>
        <p className="text-ash-ink text-sm mb-4">
          Lo que se saca de la máquina sin venderse (caducado, dañado, robo). Sin un lector DEX, lo que falta al
          surtir se calcula como venta, no como merma — por eso aquí solo se ve lo registrado a mano.
        </p>

        <div className="flex bg-bone rounded-lg p-1 mb-5 w-fit">
          {RANGES.map((r) => (
            <button
              key={r.k}
              onClick={() => setRange(r.k)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                range === r.k ? 'bg-white shadow-sm text-ink' : 'text-ash-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Kpi label="Registrada a mano" value={formatMoney(t?.cost ?? 0)} sub={`${t?.units ?? 0} piezas`} danger={(t?.units ?? 0) > 0} />
          <Kpi label="Entradas" value={String(report?.entries.length ?? 0)} sub="en el período" />
          <Kpi
            label="Producto con más merma"
            value={report?.products[0]?.name ?? '—'}
            sub={report?.products[0] ? `${report.products[0].units} piezas` : undefined}
          />
        </div>

        {(report?.byReason.length ?? 0) > 0 && (
          <div className="card p-5 mb-6">
            <h2 className="font-display font-medium text-ink mb-3">Por razón</h2>
            <div className="flex flex-wrap gap-4 text-sm">
              {report!.byReason.map((w) => (
                <div key={w.reason}>
                  <div className="text-xs text-ash-ink">{REASONS[w.reason] ?? w.reason}</div>
                  <div className="font-semibold text-ink">{w.units} piezas</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card p-5 mb-6">
          <h2 className="font-display font-medium text-ink mb-3">Historial</h2>
          {(report?.entries.length ?? 0) === 0 ? (
            <p className="text-sm text-ash-ink py-4 text-center">Sin merma registrada en el período. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ash-ink">
                  <tr>
                    <th className="py-1">Fecha</th>
                    <th>Producto</th>
                    <th>Espiral</th>
                    <th className="text-right">Piezas</th>
                    <th className="text-right">Costo</th>
                    <th>Razón</th>
                    <th className="pl-3">Quién</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash/10 text-ink">
                  {report!.entries.map((e) => (
                    <tr key={e.id}>
                      <td className="py-1.5 whitespace-nowrap">{formatDate(e.createdAt)}</td>
                      <td>{e.productName}</td>
                      <td className="font-mono text-xs">{e.slotCode ?? '—'}</td>
                      <td className="text-right font-semibold">{e.quantity}</td>
                      <td className="text-right">{formatMoney(e.cost)}</td>
                      <td className="text-xs">{REASONS[e.reason] ?? e.reason}</td>
                      <td className="pl-3 text-xs text-ash-ink">{e.userName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-medium text-ink mb-1">Registrar merma</h2>
          <p className="text-xs text-ash-ink mb-3">Para lo que sacas sin venderse. Baja del espiral.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {machines.length > 1 && (
              <select value={formMachine} onChange={(e) => setFormMachine(e.target.value)} className="input">
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <select
              value={slotId}
              onChange={(e) => {
                setSlotId(e.target.value);
                const s = detail?.slots.find((x) => x.id === e.target.value);
                setProductId(s?.items.length === 1 ? s.items[0].productId : '');
              }}
              className="input"
            >
              <option value="">Espiral…</option>
              {(detail?.slots ?? [])
                .filter((s) => s.items.length > 0)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.items.map((i) => i.product.name).join(' / ')}
                  </option>
                ))}
            </select>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="input" disabled={!slot}>
              <option value="">Producto…</option>
              {(slot?.items ?? []).map((i) => (
                <option key={i.productId} value={i.productId}>
                  {i.product.name} ({i.currentQty} en el espiral)
                </option>
              ))}
            </select>
            <div className="grid grid-cols-[5rem_1fr] gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
                className="input text-center"
                aria-label="Piezas"
              />
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="input">
                {Object.entries(REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="input" />
            <button onClick={register} disabled={saving || !slotId || !productId || !(parseInt(qty, 10) > 0)} className="btn-primary">
              {saving ? 'Guardando…' : 'Registrar merma'}
            </button>
          </div>
          {msg && <p className="text-xs text-ink mt-2">{msg}</p>}
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ash-ink">{label}</div>
      <div className={`text-xl font-display font-bold mt-1 truncate ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-ash-ink mt-0.5">{sub}</div>}
    </div>
  );
}
