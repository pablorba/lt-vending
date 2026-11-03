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

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [machines, setMachines] = useState<Machine[] | null>(null);

  useEffect(() => {
    apiFetch<Machine[]>('/machines').then(setMachines).catch(() => setMachines([]));
  }, []);

  return (
    <AppShell>
      <h1 className="text-lg font-semibold text-text mb-1">
        Hola, {user?.name?.split(' ')[0] ?? 'operador'}
      </h1>
      <p className="text-sm text-muted mb-6">
        Esto es el esqueleto del sistema. Inventario, ventas, utilidad y alertas
        llegan en la siguiente fase.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-muted">Máquinas activas</p>
          <p className="text-2xl font-semibold text-text mt-1">
            {machines ? machines.filter((m) => m.isActive).length : '—'}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Alertas</p>
          <p className="text-2xl font-semibold text-text mt-1">—</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-muted">Utilidad del mes</p>
          <p className="text-2xl font-semibold text-text mt-1">—</p>
        </div>
      </div>
    </AppShell>
  );
}
