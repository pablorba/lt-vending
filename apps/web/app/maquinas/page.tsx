'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';

interface Machine {
  id: string;
  name: string;
  location: string | null;
  notes: string | null;
  isActive: boolean;
  maxProductsPerSlot: number;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMax, setEditMax] = useState('4');

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

  function startEdit(m: Machine) {
    setEditingId(m.id);
    setEditName(m.name);
    setEditLocation(m.location ?? '');
    setEditMax(String(m.maxProductsPerSlot));
  }

  async function saveEdit() {
    if (!editingId) return;
    setBusy(true);
    try {
      await apiFetch(`/machines/${editingId}`, {
        method: 'PATCH',
        body: {
          name: editName,
          location: editLocation || undefined,
          maxProductsPerSlot: parseInt(editMax, 10) || 4,
        },
      });
      setEditingId(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(m: Machine) {
    await apiFetch(`/machines/${m.id}`, { method: 'PATCH', body: { isActive: !m.isActive } });
    load();
  }

  return (
    <AppShell>
      <div className="p-6 max-w-3xl mx-auto">
        <p className="eyebrow">Vending</p>
        <h1 className="text-3xl font-display font-medium text-ink mb-4">Máquinas</h1>

        <form onSubmit={onSubmit} className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            className="input"
            placeholder='Nombre (ej. AMS VISI Combo 39")'
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Ubicación (opcional)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <button type="submit" disabled={busy} className="btn-primary whitespace-nowrap">
            Agregar máquina
          </button>
        </form>

        {machines === null ? (
          <p className="text-sm text-ash-ink">Cargando…</p>
        ) : machines.length === 0 ? (
          <p className="text-sm text-ash-ink">Todavía no tienes máquinas registradas.</p>
        ) : (
          <div className="space-y-2">
            {machines.map((m) =>
              editingId === m.id ? (
                <div key={m.id} className="card p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" />
                    <input
                      className="input"
                      value={editLocation}
                      onChange={(e) => setEditLocation(e.target.value)}
                      placeholder="Ubicación"
                    />
                    <input
                      className="input"
                      type="text"
                      inputMode="numeric"
                      value={editMax}
                      onChange={(e) => setEditMax(e.target.value.replace(/\D/g, ''))}
                      placeholder="Máx. productos/espiral"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEdit} disabled={busy} className="btn-primary text-sm">
                      Guardar
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn-secondary text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="card p-4 flex items-center justify-between gap-3">
                  <button onClick={() => startEdit(m)} className="text-left flex-1">
                    <p className="font-medium text-ink">{m.name}</p>
                    {m.location && <p className="text-sm text-ash-ink">{m.location}</p>}
                  </button>
                  <button
                    onClick={() => toggleActive(m)}
                    className={
                      m.isActive
                        ? 'text-xs font-medium text-ink bg-accent/15 px-2 py-1 rounded-full'
                        : 'text-xs font-medium text-ash-ink bg-bone px-2 py-1 rounded-full'
                    }
                  >
                    {m.isActive ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
