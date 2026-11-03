'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
  slotFree: number;
  productId: string;
  productName: string;
  price: number;
  currentQty: number;
  perDay: number;
  coverDays: number | null;
  urgent: boolean;
}

interface Plan {
  daysMeasured: number;
  emptySlots: number;
  rows: PlanRow[];
}

const cover = (d: number | null) =>
  d === null ? '—' : d < 1 ? 'menos de 1 día' : d < 2 ? '1 día' : `${Math.floor(d)} días`;

export default function LlenarPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [machineId, setMachineId] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlyNeeded, setOnlyNeeded] = useState(true);

  const load = useCallback(async (mid: string) => {
    try {
      setPlan(await apiFetch<Plan>(`/machines/${mid}/restock-plan`));
    } finally {
      setLoading(false);
    }
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

  // Cuántos productos comparten cada espiral, para repartir lo libre entre ellos.
  const shareCount = new Map<string, number>();
  for (const r of plan?.rows ?? []) shareCount.set(r.slotId, (shareCount.get(r.slotId) ?? 0) + 1);

  const rows = (plan?.rows ?? [])
    .filter((r) => !onlyNeeded || r.urgent || r.slotFree > 0)
    .sort((a, b) => a.level - b.level || a.position - b.position);

  const picking = new Map<string, { name: string; units: number; slots: Set<string> }>();
  for (const r of plan?.rows ?? []) {
    const share = Math.floor(r.slotFree / (shareCount.get(r.slotId) ?? 1));
    if (share <= 0) continue;
    const cur = picking.get(r.productId) ?? { name: r.productName, units: 0, slots: new Set<string>() };
    cur.units += share;
    cur.slots.add(r.code);
    picking.set(r.productId, cur);
  }
  const pickingRows = [...picking.values()].sort((a, b) => b.units - a.units);
  const totalSuggested = pickingRows.reduce((a, p) => a + p.units, 0);

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-1">
          <h1 className="text-3xl font-display font-medium text-ink">Qué llenar</h1>
          <Link href="/surtir" className="btn-primary text-sm">
            Empezar surtido
          </Link>
        </div>
        <p className="text-ash-ink text-sm mb-4">
          Lo que hay en cada espiral baja con lo que cuentas al surtir. La sugerencia llena cada espiral repartiendo
          su capacidad libre entre sus productos.
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

        <div className="card p-5 mb-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="font-display font-medium text-ink">Llevar del surtido</h2>
            <span className="text-sm text-ink">
              <b>{totalSuggested}</b> piezas de {pickingRows.length} productos
            </span>
          </div>
          {pickingRows.length === 0 ? (
            <p className="text-sm text-ash-ink py-4 text-center">La máquina está llena. 🎉</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ash-ink">
                  <tr>
                    <th className="py-1">Producto</th>
                    <th className="text-right">Llevar</th>
                    <th className="pl-3">Espirales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ash/10 text-ink">
                  {pickingRows.map((p) => (
                    <tr key={p.name}>
                      <td className="py-1.5 font-semibold">{p.name}</td>
                      <td className="text-right font-bold">{p.units}</td>
                      <td className="pl-3 text-xs text-ash-ink font-mono">{[...p.slots].join(' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="font-display font-medium text-ink">Por espiral</h2>
            <label className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" checked={onlyNeeded} onChange={(e) => setOnlyNeeded(e.target.checked)} />
              Solo los que necesitan algo
            </label>
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-ash-ink py-4 text-center">Nada que llenar.</p>
          ) : (
            <div className="divide-y divide-ash/10">
              {rows.map((r) => {
                const fill = r.capacity > 0 ? Math.min(100, (r.slotLoaded / r.capacity) * 100) : 0;
                const share = Math.floor(r.slotFree / (shareCount.get(r.slotId) ?? 1));
                return (
                  <div key={`${r.slotId}:${r.productId}`} className="py-2 flex flex-wrap items-center gap-3">
                    <div className="w-16">
                      <div className="font-mono font-semibold text-ink text-sm">{r.code}</div>
                    </div>
                    <div className="flex-1 min-w-[10rem]">
                      <div className="text-sm font-semibold text-ink">
                        {r.productName}
                        {r.urgent && <span className="ml-2 text-[11px] font-semibold text-amber-700">se acaba</span>}
                      </div>
                      <div className="text-[11px] text-ash-ink">
                        hay {r.currentQty}
                        {r.perDay > 0 && ` · ${r.perDay}/día · alcanza ${cover(r.coverDays)}`}
                      </div>
                      <div className="mt-1 h-1.5 w-full max-w-[12rem] rounded-full bg-bone overflow-hidden">
                        <div
                          className={`lt-grow h-full rounded-full ${fill < 25 ? 'bg-amber-500' : 'bg-ink/70'}`}
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-16">
                      <div className="text-[10px] text-ash-ink">Meter</div>
                      <div className="text-lg font-display font-bold text-ink">{share}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {(plan?.emptySlots ?? 0) > 0 && (
            <p className="text-xs text-ash-ink mt-3">
              Hay <b>{plan!.emptySlots}</b> espirales sin producto asignado.{' '}
              <Link href="/planograma" className="text-accent-ink underline">
                Configúralos en el planograma
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
