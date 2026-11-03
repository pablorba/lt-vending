'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

interface Machine {
  id: string;
  name: string;
}

interface PlanRow {
  slotId: string;
  code: string;
  level: number;
  position: number;
  capacity: number;
  slotLoaded: number;
  productId: string;
  productName: string;
  price: number;
  currentQty: number;
  perDay: number;
  urgent: boolean;
}

interface Plan {
  rows: PlanRow[];
}

const LEVEL_LABEL = (n: number) => `Nivel ${n}`;

export default function SurtirPage() {
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [found, setFound] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ soldUnits: number; soldValue: number } | null>(null);

  const load = useCallback(async (mid: string) => {
    const p = await apiFetch<Plan>(`/machines/${mid}/restock-plan`);
    setPlan(p);
    setFound({});
    setAdded({});
    setLoading(false);
  }, []);

  useEffect(() => {
    apiFetch<Machine[]>('/machines')
      .then((ms) => {
        setMachines(ms);
        if (ms.length) {
          setMachineId(ms[0].id);
          load(ms[0].id);
        } else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [load]);

  const rowKey = (r: PlanRow) => `${r.slotId}::${r.productId}`;
  const num = (v: string | undefined) => {
    const n = parseInt(v ?? '', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  };

  const active = useMemo(
    () => (plan?.rows ?? []).filter((r) => (found[rowKey(r)] ?? '') !== ''),
    [plan, found],
  );

  const totals = useMemo(() => {
    let soldUnits = 0;
    let soldValue = 0;
    let addedUnits = 0;
    for (const r of active) {
      const f = num(found[rowKey(r)]);
      const a = num(added[rowKey(r)]);
      const sold = Math.max(0, r.currentQty - f);
      soldUnits += sold;
      soldValue += sold * r.price;
      addedUnits += a;
    }
    return { soldUnits, soldValue: Math.round(soldValue * 100) / 100, addedUnits };
  }, [active, found, added]);

  const overCapacity = useMemo(() => {
    const rows = plan?.rows ?? [];
    const bySlot = new Map<string, { code: string; capacity: number; total: number }>();
    for (const r of rows) {
      const cur = bySlot.get(r.slotId) ?? { code: r.code, capacity: r.capacity, total: 0 };
      const k = rowKey(r);
      const counted = (found[k] ?? '') !== '';
      cur.total += counted ? num(found[k]) + num(added[k]) : r.currentQty;
      bySlot.set(r.slotId, cur);
    }
    return [...bySlot.values()].filter((v) => v.total > v.capacity);
  }, [plan, found, added]);

  async function save() {
    if (!active.length) {
      setError('Captura el conteo de al menos un espiral.');
      return;
    }
    if (overCapacity.length) {
      setError(`No caben: ${overCapacity.map((v) => `${v.code} (${v.total} de ${v.capacity})`).join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ soldUnits: number; soldValue: string }>('/restocks', {
        method: 'POST',
        body: {
          machineId,
          notes: notes.trim() || undefined,
          lines: active.map((r) => ({
            slotId: r.slotId,
            productId: r.productId,
            foundQty: num(found[rowKey(r)]),
            addedQty: num(added[rowKey(r)]),
          })),
        },
      });
      setDone({ soldUnits: res.soldUnits, soldValue: Number(res.soldValue) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar');
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

  if (done) {
    return (
      <AppShell>
        <div className="p-6 max-w-lg mx-auto text-center">
          <div className="card p-8">
            <div className="text-5xl mb-3">✅</div>
            <h1 className="text-2xl font-display font-medium text-ink mb-2">Surtido registrado</h1>
            {done.soldUnits > 0 && (
              <p className="text-ash-ink mb-3">
                Por conteo se vendieron <b className="text-ink">{done.soldUnits} piezas</b> por{' '}
                <b className="text-ink">{formatMoney(done.soldValue)}</b> desde el surtido anterior.
              </p>
            )}
            <div className="flex gap-2 justify-center mt-4">
              <button
                onClick={() => {
                  setDone(null);
                  load(machineId);
                }}
                className="btn-secondary"
              >
                Otro surtido
              </button>
              <button onClick={() => router.push('/dashboard')} className="btn-primary">
                Ver tablero
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  const rows = plan?.rows ?? [];
  const byLevel = new Map<number, PlanRow[]>();
  for (const r of rows) byLevel.set(r.level, [...(byLevel.get(r.level) ?? []), r]);
  for (const arr of byLevel.values()) arr.sort((a, b) => a.position - b.position);

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto pb-40">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-1">
          <h1 className="text-3xl font-display font-medium text-ink">Surtir máquina</h1>
          <Link href="/llenar" className="text-sm text-accent-ink hover:underline">
            Ver qué llenar
          </Link>
        </div>
        <p className="text-ash-ink text-sm mb-5">
          Cuenta lo que hay en cada espiral y captúralo en <b>Encontré</b>. La venta se calcula sola. Los espirales
          que dejes en blanco no se tocan.
        </p>

        {machines.length > 1 && (
          <select
            value={machineId}
            onChange={(e) => {
              setMachineId(e.target.value);
              setLoading(true);
              load(e.target.value);
            }}
            className="input w-auto mb-4"
          >
            {machines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-ash-ink mb-4">Ningún espiral tiene producto asignado todavía.</p>
            <Link href="/planograma" className="btn-primary">
              Configurar planograma
            </Link>
          </div>
        ) : (
          <>
            {[...byLevel.keys()]
              .sort((a, b) => a - b)
              .map((level) => (
                <div key={level} className="mb-5">
                  <h2 className="font-display font-medium text-ink text-sm mb-2">{LEVEL_LABEL(level)}</h2>
                  <div className="card divide-y divide-ash/10">
                    {[...new Map(byLevel.get(level)!.map((r) => [r.slotId, r])).values()].map((first) => {
                      const slotRows = byLevel.get(level)!.filter((x) => x.slotId === first.slotId);
                      const slotTotal = slotRows.reduce((acc, r) => {
                        const k = rowKey(r);
                        return acc + ((found[k] ?? '') !== '' ? num(found[k]) + num(added[k]) : r.currentQty);
                      }, 0);
                      const slotOver = slotTotal > first.capacity;
                      return (
                        <div key={first.slotId} className="p-3">
                          <div className="flex flex-wrap items-baseline gap-2 mb-2">
                            <span className="font-mono font-semibold text-ink text-sm">{first.code}</span>
                            <span className={`text-[11px] ${slotOver ? 'text-red-600 font-semibold' : 'text-ash-ink'}`}>
                              {slotTotal} de {first.capacity} piezas
                              {slotOver && ' · no caben'}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {slotRows.map((r) => {
                              const k = rowKey(r);
                              const f = found[k] ?? '';
                              const a = added[k] ?? '';
                              const counted = f !== '';
                              const sold = counted ? Math.max(0, r.currentQty - num(f)) : null;
                              return (
                                <div key={k} className="flex flex-wrap items-center gap-3">
                                  <div className="flex-1 min-w-[9rem]">
                                    <div className="text-sm font-semibold text-ink truncate">{r.productName}</div>
                                    <div className="text-[11px] text-ash-ink">
                                      dejaste {r.currentQty}
                                      {r.perDay > 0 && ` · ${r.perDay}/día`}
                                      {r.urgent && <span className="text-amber-700 font-semibold"> · urge</span>}
                                    </div>
                                  </div>
                                  <label className="text-center">
                                    <div className="text-[10px] text-ash-ink">Encontré</div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={f}
                                      onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '');
                                        setFound({ ...found, [k]: v });
                                      }}
                                      placeholder="—"
                                      className={`w-14 text-center rounded border py-1 font-mono ${
                                        counted ? 'border-ink/40' : 'border-ash/30'
                                      }`}
                                    />
                                  </label>
                                  <label className="text-center">
                                    <div className="text-[10px] text-ash-ink">Metí</div>
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      value={a}
                                      onChange={(e) => setAdded({ ...added, [k]: e.target.value.replace(/\D/g, '') })}
                                      placeholder="—"
                                      className={`w-14 text-center rounded border py-1 font-mono ${
                                        slotOver ? 'border-red-400 bg-red-50' : 'border-ash/30'
                                      }`}
                                    />
                                  </label>
                                  <div className="w-24 text-right">
                                    {sold !== null ? (
                                      <>
                                        <div className="text-sm font-bold text-ink">{sold} vend.</div>
                                        <div className="text-[11px] text-ash-ink">{formatMoney(sold * r.price)}</div>
                                      </>
                                    ) : (
                                      <span className="text-[11px] text-ash-ink">sin contar</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

            <label className="block mb-24">
              <span className="text-sm font-semibold text-ink">Notas (opcional)</span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. se atoró el espiral 3-04"
                className="input mt-1"
              />
            </label>

            <div className="fixed z-20 left-3 right-3 sm:left-6 sm:right-6 bottom-3 bg-white/95 backdrop-blur rounded-2xl p-4 shadow-card-hover">
              <div className="max-w-5xl mx-auto flex flex-wrap items-center gap-4">
                <div>
                  <div className="text-[11px] text-ash-ink">Vendido (por conteo)</div>
                  <div className="text-xl font-display font-medium text-ink">
                    {formatMoney(totals.soldValue)}{' '}
                    <span className="text-sm font-normal text-ash-ink">({totals.soldUnits} pzas)</span>
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-ash-ink">Cargando</div>
                  <div className="text-xl font-display font-bold text-ink">{totals.addedUnits} pzas</div>
                </div>
                <div className="text-xs text-ash-ink">
                  {active.length} de {rows.length} renglones contados
                </div>
                <div className="flex-1" />
                {error && <p className="text-red-600 text-sm w-full sm:w-auto">{error}</p>}
                <button onClick={save} disabled={saving || !active.length || overCapacity.length > 0} className="btn-primary">
                  {saving ? 'Guardando…' : 'Registrar surtido'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
