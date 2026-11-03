'use client';

import { useEffect, useState } from 'react';
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
}

function money(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
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

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-text mb-1">
        Hola, {user?.name?.split(' ')[0] ?? 'operador'}
      </h1>
      <p className="text-sm text-muted mb-6">Últimos 30 días, todas tus máquinas.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-muted">Máquinas activas</p>
          <p className="text-2xl font-semibold text-text mt-1">
            {machines ? machines.filter((m) => m.isActive).length : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Ventas (inferidas)</p>
          <p className="text-2xl font-semibold text-text mt-1">{data ? money(data.soldValue) : '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Utilidad bruta</p>
          <p className="text-2xl font-semibold text-positive mt-1">
            {data ? money(data.grossProfit) : '—'}
          </p>
          {data && <p className="text-xs text-subtle mt-0.5">{data.grossMargin}% margen</p>}
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Merma</p>
          <p className="text-2xl font-semibold text-danger mt-1">
            {data ? `${data.wasteUnits} pzas` : '—'}
          </p>
          {data && <p className="text-xs text-subtle mt-0.5">{money(data.wasteCost)} en costo</p>}
        </div>
      </div>

      {data && data.cashDifference !== 0 && (
        <div className="card p-4 mb-6 border-warning/40 bg-warning-soft">
          <p className="text-sm text-text">
            {data.cashDifference > 0
              ? `Hay ${money(data.cashDifference)} de diferencia: se vendió más de lo que se recogió.`
              : `Se recogió ${money(-data.cashDifference)} más de lo que marca la venta inferida.`}
          </p>
        </div>
      )}

      {data && data.topProducts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="font-medium text-text">Top productos (30 días)</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {data.topProducts.slice(0, 10).map((p) => (
                <tr key={p.productId}>
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
