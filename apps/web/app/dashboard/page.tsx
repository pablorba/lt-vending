'use client';

import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
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

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
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
    <div className="card px-3 py-2 text-xs shadow-float">
      <p className="font-medium text-text">{shortDate(row.date)}</p>
      <p className="text-muted">
        {money(row.value)} · {row.units} pzas
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

  const stats = [
    {
      label: 'Máquinas activas',
      value: machines ? String(machines.filter((m) => m.isActive).length) : '—',
      tone: 'text-text',
    },
    { label: 'Ventas (inferidas)', value: data ? money(data.soldValue) : '—', tone: 'text-text' },
    {
      label: 'Utilidad bruta',
      value: data ? money(data.grossProfit) : '—',
      hint: data ? `${data.grossMargin}% margen` : undefined,
      tone: 'text-positive',
    },
    {
      label: 'Merma',
      value: data ? `${data.wasteUnits} pzas` : '—',
      hint: data ? `${money(data.wasteCost)} en costo` : undefined,
      tone: 'text-danger',
    },
  ];

  return (
    <AppShell>
      <h1 className="reveal-line [--i:0] text-lg font-semibold text-text mb-1">
        Hola, {user?.name?.split(' ')[0] ?? 'operador'}
      </h1>
      <p className="reveal-line [--i:1] text-sm text-muted mb-6">Últimos 30 días, todas tus máquinas.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map((s, i) => (
          <div key={s.label} className="scroll-rise card p-4" style={{ '--i': i } as React.CSSProperties}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${s.tone}`}>{s.value}</p>
            {s.hint && <p className="text-xs text-subtle mt-0.5">{s.hint}</p>}
          </div>
        ))}
      </div>

      {data && data.daily.length > 0 && (
        <div className="scroll-rise card p-4 mb-6">
          <p className="font-medium text-text mb-3">Ventas por día</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11, fill: 'var(--text-subtle)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgb(var(--accent-rgb) / 0.1)' }} />
              <Bar dataKey="value" fill="rgb(var(--accent-rgb))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data && data.cashDifference !== 0 && (
        <div className="scroll-rise card p-4 mb-6 border-warning/40 bg-warning-soft">
          <p className="text-sm text-text">
            {data.cashDifference > 0
              ? `Hay ${money(data.cashDifference)} de diferencia: se vendió más de lo que se recogió.`
              : `Se recogió ${money(-data.cashDifference)} más de lo que marca la venta inferida.`}
          </p>
        </div>
      )}

      {data && data.topProducts.length > 0 && (
        <div className="scroll-rise card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-medium text-text">Top productos (30 días)</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {data.topProducts.slice(0, 10).map((p) => (
                <tr key={p.productId} className="hover:bg-surface-2">
                  <td className="px-4 py-2 text-text">{p.name}</td>
                  <td className="px-4 py-2 text-muted text-right">{p.units} pzas</td>
                  <td className="px-4 py-2 text-text text-right">{money(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
