'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';

interface Machine {
  id: string;
  name: string;
  location: string | null;
  isActive: boolean;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<Machine[]>('/machines').then(setMachines).catch(() => setMachines([]));
  }

  useEffect(load, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await apiFetch('/machines', { method: 'POST', body: { name, location: location || undefined } });
      setName('');
      setLocation('');
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="reveal-line [--i:0] text-lg font-semibold text-text mb-4">Máquinas</h1>

      <form onSubmit={onSubmit} className="reveal-line [--i:1] card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <input
          className="input"
          placeholder="Nombre (ej. AMS VISI Combo 39&quot;)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Ubicación (opcional)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary press whitespace-nowrap">
          Agregar máquina
        </button>
      </form>

      {machines === null ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : machines.length === 0 ? (
        <p className="text-sm text-muted">Todavía no tienes máquinas registradas.</p>
      ) : (
        <div className="space-y-2">
          {machines.map((m, i) => (
            <Link
              key={m.id}
              href={`/maquinas/${m.id}`}
              style={{ '--i': i } as React.CSSProperties}
              className="scroll-rise press card p-4 flex items-center justify-between hover:bg-surface-2"
            >
              <div>
                <p className="font-medium text-text">{m.name}</p>
                {m.location && <p className="text-sm text-muted">{m.location}</p>}
              </div>
              <span
                className={
                  m.isActive
                    ? 'text-xs font-medium text-positive bg-positive-soft px-2 py-1 rounded-full'
                    : 'text-xs font-medium text-muted bg-surface-2 px-2 py-1 rounded-full'
                }
              >
                {m.isActive ? 'Activa' : 'Inactiva'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
