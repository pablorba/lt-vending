'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';

interface Machine {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

interface DashboardData {
  soldValue: number;
  grossProfit: number;
  grossMargin: number;
  soldUnits: number;
  collected: number;
  cashDifference: number;
  wasteUnits: number;
  wasteCost: number;
  topProducts: Array<{ productId: string; name: string; units: number; value: number }>;
  daily: Array<{ date: string; value: number; units: number }>;
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** Siempre se ve la gráfica de los últimos 30 días, aunque no haya ventas todavía. */
function fillDailySeries(daily: Array<{ date: string; value: number; units: number }>, days = 30) {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const out: Array<{ date: string; value: number; units: number }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push(byDate.get(key) ?? { date: key, value: 0, units: 0 });
  }
  return out;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; value: number; units: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-medium text-ink">{shortDate(row.date)}</p>
      <p className="text-ash-ink">
        {formatMoney(row.value)} · {row.units} pzas
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    apiFetch<Machine[]>('/machines').then(setMachines).catch(() => setMachines([]));

    const from = new Date();
    from.setDate(from.getDate() - 30);
    apiFetch<DashboardData>(`/dashboard?from=${from.toISOString()}`)
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (machines && machines.length === 0) {
    return (
      <AppShell>
        <div className="p-6 max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-display font-medium text-ink mb-2">Vending</h1>
          <p className="text-ash-ink mb-6">
            Todavía no hay máquinas registradas. Al crear una, se genera su planograma.
          </p>
          <Link href="/maquinas" className="btn-primary">
            Agregar máquina
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="lt-hero flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <p className="eyebrow">Vending · 30 días</p>
            <h1 className="text-3xl font-display font-medium text-ink">Tablero</h1>
            <p className="text-ash-ink text-sm mt-1">
              Hola, {user?.name?.split(' ')[0] ?? 'operador'}. La venta se estima con el conteo al surtir — no hay
              lector DEX conectado todavía.
            </p>
          </div>
          <Link href="/surtir" className="btn-primary text-sm">
            Surtir máquina
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Kpi label="Máquinas activas" value={String(machines ? machines.filter((m) => m.isActive).length : '—')} />
          <Kpi label="Venta (inferida)" value={data ? formatMoney(data.soldValue) : '—'} />
          <Kpi
            label="Utilidad bruta"
            value={data ? formatMoney(data.grossProfit) : '—'}
            sub={data ? `margen ${data.grossMargin}%` : undefined}
          />
          <Kpi
            label="Merma"
            value={data ? `${data.wasteUnits} pzas` : '—'}
            sub={data ? formatMoney(data.wasteCost) + ' a costo' : undefined}
            danger={!!data && data.wasteUnits > 0}
          />
        </div>

        <div className="card p-5 mb-6">
          <h2 className="font-display font-medium text-ink mb-3">Venta por día</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={fillDailySeries(data?.daily ?? [])} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: '#a6a6a6' }}
                axisLine={{ stroke: '#ededed' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(30 / 8))}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(21,25,18,0.04)' }} />
              <Bar dataKey="value" fill="#d68509" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
          {data && data.daily.every((d) => d.value === 0) && (
            <p className="text-xs text-ash-ink text-center mt-2">Sin ventas todavía en los últimos 30 días.</p>
          )}
        </div>

        {data && data.cashDifference !== 0 && (
          <div className="card p-4 mb-6 bg-amber-50">
            <p className="text-sm text-ink">
              {data.cashDifference > 0
                ? `Hay ${formatMoney(data.cashDifference)} de diferencia: se vendió más de lo que se recogió.`
                : `Se recogió ${formatMoney(-data.cashDifference)} más de lo que marca la venta inferida.`}{' '}
              <Link href="/cortes" className="underline">
                Ver cortes
              </Link>
              .
            </p>
          </div>
        )}

        {data && data.topProducts.length > 0 && (
          <div className="card p-5">
            <h2 className="font-display font-medium text-ink mb-3">Lo que más se vende</h2>
            <ul className="space-y-2">
              {data.topProducts.slice(0, 10).map((p, i) => (
                <li key={p.productId} className="flex items-center gap-2">
                  <span className="text-accent-ink font-semibold w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink truncate">{p.name}</div>
                    <div className="text-xs text-ash-ink">{p.units} piezas</div>
                  </div>
                  <div className="text-sm font-semibold text-ink whitespace-nowrap">{formatMoney(p.value)}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-ash-ink">{label}</div>
      <div className={`text-2xl font-display font-medium mt-1 ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</div>
      {sub && <div className="text-xs text-ash-ink mt-0.5">{sub}</div>}
    </div>
  );
}
