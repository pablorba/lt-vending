'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
}

interface SlotItem {
  id: string;
  productId: string;
  currentQty: number;
  product: { id: string; name: string };
}

interface Slot {
  id: string;
  level: number;
  position: number;
  code: string;
  capacity: number;
  isActive: boolean;
  items: SlotItem[];
}

interface Machine {
  id: string;
  name: string;
  maxProductsPerSlot: number;
  slots: Slot[];
}

export default function PlanogramaPage() {
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [machineId, setMachineId] = useState('');
  const [machine, setMachine] = useState<Machine | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelSlotId, setPanelSlotId] = useState<string | null>(null);
  const [addingToLevel, setAddingToLevel] = useState<number | null>(null);
  const [addingLevel, setAddingLevel] = useState(false);

  function load(mid: string) {
    apiFetch<Machine>(`/machines/${mid}`).then(setMachine).catch(() => setMachine(null));
  }

  useEffect(() => {
    Promise.all([apiFetch<{ id: string; name: string }[]>('/machines'), apiFetch<Product[]>('/products')])
      .then(([ms, ps]) => {
        setMachines(ms);
        setProducts(ps);
        if (ms.length) {
          setMachineId(ms[0].id);
          load(ms[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const byLevel = useMemo(() => {
    const map = new Map<number, Slot[]>();
    for (const slot of machine?.slots ?? []) map.set(slot.level, [...(map.get(slot.level) ?? []), slot]);
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [machine]);

  const activeSlot = machine?.slots.find((s) => s.id === panelSlotId) ?? null;
  const totalCapacity = machine?.slots.reduce((a, s) => a + s.capacity, 0) ?? 0;
  const assigned = machine?.slots.filter((s) => s.items.length > 0).length ?? 0;

  if (loading) return <AppShell><div className="p-6 text-ash-ink">Cargando planograma…</div></AppShell>;
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

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-display font-medium text-ink mb-1">Planograma</h1>
        <p className="text-ash-ink text-sm mb-4">
          Cada espiral admite hasta <b>{machine?.maxProductsPerSlot ?? 4} productos</b> distintos. La capacidad es
          del espiral completo. {machine?.slots.length ?? 0} espirales · {totalCapacity} piezas ·{' '}
          <b>{assigned} con producto</b>.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          {machines.length > 1 && (
            <select
              value={machineId}
              onChange={(e) => {
                setMachineId(e.target.value);
                setPanelSlotId(null);
                setLoading(true);
                load(e.target.value);
                setLoading(false);
              }}
              className="input w-auto"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          )}
          <MaxProductsEditor machineId={machineId} value={machine?.maxProductsPerSlot ?? 4} onSaved={() => load(machineId)} onError={setError} />
        </div>

        {error && <div className="card p-3 mb-4 bg-red-50 text-red-800 text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {byLevel.map(([level, slots]) => (
              <div key={level}>
                <h2 className="font-display font-medium text-ink text-sm mb-2">
                  Nivel {level} <span className="font-normal text-ash-ink ml-1">{slots.length} espirales</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const loaded = slot.items.reduce((a, i) => a + i.currentQty, 0);
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setPanelSlotId(slot.id)}
                        className={cn(
                          'w-28 rounded-xl border p-2 text-left transition',
                          !slot.isActive && 'opacity-50',
                          panelSlotId === slot.id ? 'border-accent bg-accent/10' : 'border-ink/10 bg-white hover:bg-bone/50',
                        )}
                      >
                        <p className="text-xs font-mono font-semibold text-ink">{slot.code}</p>
                        {!slot.isActive && <p className="text-[11px] text-ash-ink">Inactivo</p>}
                        {slot.items.length === 0 ? (
                          <p className="text-[11px] text-ash-ink mt-1">Sin producto</p>
                        ) : (
                          <>
                            <p className="text-[11px] text-ash-ink mt-1 truncate">
                              {slot.items.map((i) => i.product.name).join(', ')}
                            </p>
                            <p className="text-[11px] text-ash-ink mt-1">
                              {loaded}/{slot.capacity}
                            </p>
                          </>
                        )}
                      </button>
                    );
                  })}

                  {addingToLevel === level ? (
                    <AddSlotForm
                      machineId={machineId}
                      level={level}
                      onDone={() => {
                        setAddingToLevel(null);
                        load(machineId);
                      }}
                      onError={setError}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingToLevel(level)}
                      className="w-28 rounded-xl border border-dashed border-ink/20 text-ash-ink text-sm hover:bg-bone/50"
                    >
                      + Espiral
                    </button>
                  )}
                </div>
              </div>
            ))}

            {addingLevel ? (
              <AddSlotForm
                machineId={machineId}
                onDone={() => {
                  setAddingLevel(false);
                  load(machineId);
                }}
                onError={setError}
              />
            ) : (
              <button onClick={() => setAddingLevel(true)} className="text-sm text-accent-ink hover:underline">
                + Agregar charola (nivel) nueva
              </button>
            )}
          </div>

          <div className="space-y-5">
            {activeSlot ? (
              <SlotProductsPanel
                slot={activeSlot}
                products={products}
                maxProducts={machine?.maxProductsPerSlot ?? 4}
                onSaved={() => load(machineId)}
                onError={setError}
              />
            ) : (
              <div className="card p-4 text-sm text-ash-ink">Toca un espiral para asignarle productos.</div>
            )}
            <p className="text-[11px] text-ash-ink">
              Para cambiar el producto de un espiral que todavía tiene piezas, primero sácalas y regístralas en{' '}
              <Link href="/merma" className="text-accent-ink underline">
                Merma
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SlotProductsPanel({
  slot,
  products,
  maxProducts,
  onSaved,
  onError,
}: {
  slot: Slot;
  products: Product[];
  maxProducts: number;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(slot.items.map((i) => i.productId));
  const [busy, setBusy] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  useEffect(() => setSelected(slot.items.map((i) => i.productId)), [slot.id]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : prev.length < maxProducts ? [...prev, id] : prev,
    );
  }

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/slots/${slot.id}/products`, { method: 'PUT', body: { productIds: selected } });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    setTogglingActive(true);
    try {
      await apiFetch(`/slots/${slot.id}`, { method: 'PATCH', body: { isActive: !slot.isActive } });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-ink">Espiral {slot.code}</p>
        <button onClick={toggleActive} disabled={togglingActive} className="text-xs text-accent-ink hover:underline">
          {slot.isActive ? 'Desactivar' : 'Reactivar'}
        </button>
      </div>
      <p className="text-xs text-ash-ink mb-3">Hasta {maxProducts} productos distintos.</p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {products.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => toggle(p.id)}
              disabled={!selected.includes(p.id) && selected.length >= maxProducts}
            />
            {p.name}
          </label>
        ))}
        {products.length === 0 && <p className="text-sm text-ash-ink">Agrega productos primero.</p>}
      </div>
      <button onClick={save} disabled={busy} className="btn-primary w-full mt-3">
        Guardar
      </button>
    </div>
  );
}

function AddSlotForm({
  machineId,
  level,
  onDone,
  onError,
}: {
  machineId: string;
  level?: number;
  onDone: () => void;
  onError: (m: string) => void;
}) {
  const [levelInput, setLevelInput] = useState(level ? String(level) : '');
  const [capacity, setCapacity] = useState('10');
  const [busy, setBusy] = useState(false);

  async function save() {
    const lvl = Number(levelInput);
    const cap = Number(capacity);
    if (!lvl || lvl < 1 || !cap || cap < 1) return;
    setBusy(true);
    try {
      await apiFetch(`/machines/${machineId}/slots`, { method: 'POST', body: { level: lvl, capacity: cap } });
      onDone();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo agregar el espiral');
    } finally {
      setBusy(false);
    }
  }

  if (level === undefined) {
    return (
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <input type="number" min={1} className="input w-24" placeholder="Nivel" value={levelInput} onChange={(e) => setLevelInput(e.target.value)} />
        <input type="number" min={1} className="input w-28" placeholder="Capacidad" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        <button onClick={save} disabled={busy} className="btn-primary">
          Crear charola
        </button>
        <button onClick={onDone} className="btn-secondary">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="w-28 rounded-xl border border-accent p-2 space-y-1">
      <input type="number" min={1} className="input text-xs px-2 py-1" placeholder="Capacidad" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
      <button onClick={save} disabled={busy} className="btn-primary w-full text-xs py-1">
        Agregar
      </button>
      <button onClick={onDone} className="btn-secondary w-full text-xs py-1">
        Cancelar
      </button>
    </div>
  );
}

function MaxProductsEditor({
  machineId,
  value,
  onSaved,
  onError,
}: {
  machineId: string;
  value: number;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(String(value));
  const [busy, setBusy] = useState(false);

  useEffect(() => setV(String(value)), [value]);

  async function save() {
    const n = Number(v);
    if (!n || n < 1) return;
    setBusy(true);
    try {
      await apiFetch(`/machines/${machineId}`, { method: 'PATCH', body: { maxProductsPerSlot: n } });
      setEditing(false);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} className="text-sm text-accent-ink hover:underline">
        Productos por espiral: {value}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input type="number" min={1} max={20} className="input w-20 py-1.5" value={v} onChange={(e) => setV(e.target.value)} />
      <button onClick={save} disabled={busy} className="btn-primary text-sm px-3 py-1.5">
        Guardar
      </button>
      <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-3 py-1.5">
        Cancelar
      </button>
    </div>
  );
}
