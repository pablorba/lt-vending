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

interface Collection {
  id: string;
  createdAt: string;
  cashAmount: string;
  cardAmount: string;
  notes: string | null;
  user: { name: string };
  machine: { id: string; name: string };
}

interface Dashboard {
  soldValue: number;
  collected: number;
  cashDifference: number;
}

type RangeKey = '7d' | '30d' | 'month' | '90d';
const RANGES: { k: RangeKey; label: string }[] = [
  { k: '7d', label: '7 días' },
  { k: '30d', label: '30 días' },
  { k: 'month', label: 'Este mes' },
  { k: '90d', label: '90 días' },
];

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

export default function CortesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [range, setRange] = useState<RangeKey>('30d');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  const [formMachine, setFormMachine] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cardAmount, setCardAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const { from, to } = useMemo(() => buildRange(range), [range]);

  const load = useCallback(async () => {
    const qs = `from=${from.toISOString()}&to=${to.toISOString()}`;
    const [d, c] = await Promise.all([
      apiFetch<Dashboard>(`/dashboard?${qs}`),
      apiFetch<Collection[]>('/collections?limit=50'),
    ]);
    setDashboard(d);
    setCollections(c);
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

  async function register() {
    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    if (cash <= 0 && card <= 0) return;
    setSaving(true);
    setMsg(null);
    try {
      await apiFetch('/collections', {
        method: 'POST',
        body: { machineId: formMachine, cashAmount: cash, cardAmount: card, notes: notes.trim() || undefined },
      });
      setMsg('Corte registrado.');
      setCashAmount('');
      setCardAmount('');
      setNotes('');
      await load();
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

  const diff = dashboard?.cashDifference ?? 0;

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-display font-medium text-ink mb-1">Cortes</h1>
        <p className="text-ash-ink text-sm mb-4">
          Dinero que se recoge de la máquina. Se compara contra lo vendido (calculado por el surtido) para ver si
          falta algo — sin terminal ni conteo de monedas automático, esto se registra a mano.
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
          <Kpi label="Vendido (estimado)" value={formatMoney(dashboard?.soldValue ?? 0)} />
          <Kpi label="Recogido" value={formatMoney(dashboard?.collected ?? 0)} />
          <Kpi
            label={diff > 0 ? 'Falta por recoger' : diff < 0 ? 'Se recogió de más' : 'Cuadra'}
            value={formatMoney(Math.abs(diff))}
            danger={diff > 0}
          />
        </div>

        <div className="card p-5 mb-6">
          <h2 className="font-display font-medium text-ink mb-3">Historial</h2>
          {collections.length === 0 ? (
            <p className="text-sm text-ash-ink py-4 text-center">Sin cortes registrados todavía.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ash-ink">
                  <tr>
                    <th className="py-1">Fecha</th>
                    <th>Máquina</th>
                    <th className="text-right">Efectivo</th>
                    <th className="text-right">Tarjeta</th>
                    <th className="text-right">Total</th>
                    <th className="pl-3">Quién</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash/10 text-ink">
                  {collections.map((c) => {
                    const total = Number(c.cashAmount) + Number(c.cardAmount);
                    return (
                      <tr key={c.id}>
                        <td className="py-1.5 whitespace-nowrap">{formatDate(c.createdAt)}</td>
                        <td>{c.machine.name}</td>
                        <td className="text-right">{formatMoney(Number(c.cashAmount))}</td>
                        <td className="text-right">{formatMoney(Number(c.cardAmount))}</td>
                        <td className="text-right font-semibold">{formatMoney(total)}</td>
                        <td className="pl-3 text-xs text-ash-ink">{c.user.name}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display font-medium text-ink mb-1">Registrar corte</h2>
          <p className="text-xs text-ash-ink mb-3">Lo que recogiste de la máquina hoy.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {machines.length > 1 && (
              <select value={formMachine} onChange={(e) => setFormMachine(e.target.value)} className="input sm:col-span-2">
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <input
              type="text"
              inputMode="decimal"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Efectivo"
              className="input"
            />
            <input
              type="text"
              inputMode="decimal"
              value={cardAmount}
              onChange={(e) => setCardAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              placeholder="Tarjeta"
              className="input"
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas (opcional)"
              className="input sm:col-span-2"
            />
            <button
              onClick={register}
              disabled={saving || !((parseFloat(cashAmount) || 0) > 0 || (parseFloat(cardAmount) || 0) > 0)}
              className="btn-primary sm:col-span-2"
            >
              {saving ? 'Guardando…' : 'Registrar corte'}
            </button>
          </div>
          {msg && <p className="text-xs text-ink mt-2">{msg}</p>}
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ash-ink">{label}</div>
      <div className={`text-xl font-display font-bold mt-1 truncate ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</div>
    </div>
  );
}
