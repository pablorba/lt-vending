'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  cost: string;
}

interface SlotItem {
  id: string;
  productId: string;
  currentQty: number;
  product: { id: string; name: string; sku: string | null; price: string; cost: string };
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
  location: string | null;
  isActive: boolean;
  maxProductsPerSlot: number;
  slots: Slot[];
}

const WASTE_REASONS = [
  { value: 'JAMMED', label: 'Se atoró' },
  { value: 'EXPIRED', label: 'Caducó' },
  { value: 'DAMAGED', label: 'Dañado' },
  { value: 'THEFT', label: 'Robo' },
  { value: 'OTHER', label: 'Otro' },
];

export default function MachineDetailPage() {
  const params = useParams<{ id: string }>();
  const machineId = params.id;

  const [machine, setMachine] = useState<Machine | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [panel, setPanel] = useState<{ slotId: string; mode: 'products' | 'restock' } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingToLevel, setAddingToLevel] = useState<number | null>(null);
  const [addingLevel, setAddingLevel] = useState(false);

  function load() {
    apiFetch<Machine>(`/machines/${machineId}`).then(setMachine).catch(() => setMachine(null));
    apiFetch<Product[]>('/products').then(setProducts).catch(() => setProducts([]));
  }

  useEffect(load, [machineId]);

  const byLevel = useMemo(() => {
    const map = new Map<number, Slot[]>();
    for (const slot of machine?.slots ?? []) {
      const arr = map.get(slot.level) ?? [];
      arr.push(slot);
      map.set(slot.level, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [machine]);

  const flatOptions = useMemo(
    () =>
      (machine?.slots ?? []).flatMap((s) =>
        s.items.map((it) => ({
          slotId: s.id,
          slotCode: s.code,
          productId: it.productId,
          label: `${s.code} · ${it.product.name}`,
        })),
      ),
    [machine],
  );

  const activeSlot = machine?.slots.find((s) => s.id === panel?.slotId) ?? null;

  if (!machine) {
    return (
      <AppShell>
        <p className="text-sm text-muted">Cargando…</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="reveal-line [--i:0] mb-4 flex items-start justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-text">{machine.name}</h1>
          {machine.location && <p className="text-sm text-muted">{machine.location}</p>}
        </div>
        <MaxProductsEditor machine={machine} onSaved={load} onError={setError} />
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {byLevel.map(([level, slots], levelIdx) => (
            <div key={level} className="scroll-rise" style={{ '--i': levelIdx } as React.CSSProperties}>
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                Nivel {level}
              </p>
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => {
                  const loaded = slot.items.reduce((a, i) => a + i.currentQty, 0);
                  const empty = slot.items.length === 0;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setPanel({ slotId: slot.id, mode: empty ? 'products' : 'restock' })}
                      className={cn(
                        'press w-28 rounded-lg border p-2 text-left',
                        !slot.isActive && 'opacity-50',
                        panel?.slotId === slot.id
                          ? 'border-accent bg-accent-soft'
                          : 'border-border bg-surface hover:bg-surface-2',
                      )}
                    >
                      <p className="text-xs font-semibold text-text">{slot.code}</p>
                      {!slot.isActive && <p className="text-xs text-subtle">Inactivo</p>}
                      {empty ? (
                        <p className="text-xs text-subtle mt-1">Sin producto</p>
                      ) : (
                        <>
                          <p className="text-xs text-muted mt-1 truncate">
                            {slot.items.map((i) => i.product.name).join(', ')}
                          </p>
                          <p className="text-xs text-subtle mt-1">
                            {loaded}/{slot.capacity}
                          </p>
                        </>
                      )}
                    </button>
                  );
                })}

                {addingToLevel === level ? (
                  <AddSlotForm
                    machineId={machine.id}
                    level={level}
                    onDone={() => {
                      setAddingToLevel(null);
                      load();
                    }}
                    onError={setError}
                  />
                ) : (
                  <button
                    onClick={() => setAddingToLevel(level)}
                    className="w-28 rounded-lg border border-dashed border-border text-subtle text-sm hover:bg-surface-2"
                  >
                    + Espiral
                  </button>
                )}
              </div>
            </div>
          ))}

          {addingLevel ? (
            <AddSlotForm
              machineId={machine.id}
              onDone={() => {
                setAddingLevel(false);
                load();
              }}
              onError={setError}
            />
          ) : (
            <button
              onClick={() => setAddingLevel(true)}
              className="text-sm text-accent hover:underline"
            >
              + Agregar charola (nivel) nueva
            </button>
          )}
        </div>

        <div className="reveal-line [--i:2] space-y-5">
          {activeSlot && panel?.mode === 'products' && (
            <SlotProductsPanel
              slot={activeSlot}
              products={products}
              maxProducts={machine.maxProductsPerSlot}
              onSaved={() => {
                setPanel(null);
                load();
              }}
              onToggleActive={load}
              onError={setError}
            />
          )}
          {activeSlot && panel?.mode === 'restock' && (
            <SlotRestockPanel
              machineId={machine.id}
              slot={activeSlot}
              onSaved={() => {
                setPanel(null);
                load();
              }}
              onError={setError}
            />
          )}
          {!panel && (
            <div className="card p-4 text-sm text-muted">
              Toca un espiral para editar sus productos o registrar un surtido.
            </div>
          )}

          <WastePanel machineId={machine.id} options={flatOptions} onSaved={load} onError={setError} />
          <CollectionPanel machineId={machine.id} onSaved={load} onError={setError} />
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
  onToggleActive,
  onError,
}: {
  slot: Slot;
  products: Product[];
  maxProducts: number;
  onSaved: () => void;
  onToggleActive: () => void;
  onError: (m: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>(slot.items.map((i) => i.productId));
  const [busy, setBusy] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

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
      onToggleActive();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo cambiar el estado');
    } finally {
      setTogglingActive(false);
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-medium text-text">Productos del espiral {slot.code}</p>
        <button onClick={toggleActive} disabled={togglingActive} className="text-xs text-muted hover:underline">
          {slot.isActive ? 'Desactivar espiral' : 'Reactivar espiral'}
        </button>
      </div>
      <p className="text-xs text-muted mb-3">Hasta {maxProducts} productos distintos.</p>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {products.map((p) => (
          <label key={p.id} className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={selected.includes(p.id)}
              onChange={() => toggle(p.id)}
              disabled={!selected.includes(p.id) && selected.length >= maxProducts}
            />
            {p.name}
          </label>
        ))}
        {products.length === 0 && <p className="text-sm text-muted">Agrega productos primero.</p>}
      </div>
      <button onClick={save} disabled={busy} className="btn-primary press w-full mt-3">
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
      await apiFetch(`/machines/${machineId}/slots`, {
        method: 'POST',
        body: { level: lvl, capacity: cap },
      });
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
        <input
          type="number"
          min={1}
          className="input w-24"
          placeholder="Nivel"
          value={levelInput}
          onChange={(e) => setLevelInput(e.target.value)}
        />
        <input
          type="number"
          min={1}
          className="input w-28"
          placeholder="Capacidad"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <button onClick={save} disabled={busy} className="btn-primary press">
          Crear charola
        </button>
        <button onClick={onDone} className="btn-secondary press">
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="w-28 rounded-lg border border-accent p-2 space-y-1">
      <input
        type="number"
        min={1}
        className="input text-xs px-2 py-1"
        placeholder="Capacidad"
        value={capacity}
        onChange={(e) => setCapacity(e.target.value)}
      />
      <button onClick={save} disabled={busy} className="btn-primary press w-full text-xs py-1">
        Agregar
      </button>
      <button onClick={onDone} className="btn-secondary press w-full text-xs py-1">
        Cancelar
      </button>
    </div>
  );
}

function MaxProductsEditor({
  machine,
  onSaved,
  onError,
}: {
  machine: Machine;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(machine.maxProductsPerSlot));
  const [busy, setBusy] = useState(false);

  async function save() {
    const n = Number(value);
    if (!n || n < 1) return;
    setBusy(true);
    try {
      await apiFetch(`/machines/${machine.id}`, { method: 'PATCH', body: { maxProductsPerSlot: n } });
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
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-muted hover:text-text hover:underline"
      >
        Productos por espiral: {machine.maxProductsPerSlot}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={1}
        max={20}
        className="input w-20 text-sm py-1.5"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button onClick={save} disabled={busy} className="btn-primary press text-sm px-3 py-1.5">
        Guardar
      </button>
      <button onClick={() => setEditing(false)} className="btn-secondary press text-sm px-3 py-1.5">
        Cancelar
      </button>
    </div>
  );
}

function SlotRestockPanel({
  machineId,
  slot,
  onSaved,
  onError,
}: {
  machineId: string;
  slot: Slot;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [found, setFound] = useState<Record<string, number>>(
    Object.fromEntries(slot.items.map((i) => [i.productId, i.currentQty])),
  );
  const [added, setAdded] = useState<Record<string, number>>(
    Object.fromEntries(slot.items.map((i) => [i.productId, 0])),
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch('/restocks', {
        method: 'POST',
        body: {
          machineId,
          lines: slot.items.map((i) => ({
            slotId: slot.id,
            productId: i.productId,
            foundQty: found[i.productId] ?? 0,
            addedQty: added[i.productId] ?? 0,
          })),
        },
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo registrar el surtido');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="font-medium text-text mb-1">Surtir espiral {slot.code}</p>
      <p className="text-xs text-muted mb-3">
        Capacidad {slot.capacity} piezas. "Encontrado" es lo que había al llegar.
      </p>
      <div className="space-y-3">
        {slot.items.map((i) => (
          <div key={i.productId}>
            <p className="text-sm text-text mb-1">{i.product.name}</p>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className="input"
                placeholder="Encontrado"
                value={found[i.productId] ?? 0}
                onChange={(e) =>
                  setFound((p) => ({ ...p, [i.productId]: Math.max(0, Number(e.target.value)) }))
                }
              />
              <input
                type="number"
                min={0}
                className="input"
                placeholder="Agregado"
                value={added[i.productId] ?? 0}
                onChange={(e) =>
                  setAdded((p) => ({ ...p, [i.productId]: Math.max(0, Number(e.target.value)) }))
                }
              />
            </div>
          </div>
        ))}
      </div>
      <button onClick={save} disabled={busy} className="btn-primary press w-full mt-3">
        Registrar surtido
      </button>
    </div>
  );
}

function WastePanel({
  machineId,
  options,
  onSaved,
  onError,
}: {
  machineId: string;
  options: Array<{ slotId: string; slotCode: string; productId: string; label: string }>;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [choice, setChoice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('JAMMED');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!choice) return;
    const [slotId, productId] = choice.split('::');
    setBusy(true);
    try {
      await apiFetch('/waste', { method: 'POST', body: { machineId, slotId, productId, quantity, reason } });
      setChoice('');
      setQuantity(1);
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo registrar la merma');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="font-medium text-text mb-3">Registrar merma</p>
      <div className="space-y-2">
        <select className="input" value={choice} onChange={(e) => setChoice(e.target.value)}>
          <option value="">Producto / espiral…</option>
          {options.map((o) => (
            <option key={`${o.slotId}::${o.productId}`} value={`${o.slotId}::${o.productId}`}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            className="input"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          />
          <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {WASTE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button onClick={save} disabled={busy || !choice} className="btn-secondary press w-full">
          Registrar
        </button>
      </div>
    </div>
  );
}

function CollectionPanel({
  machineId,
  onSaved,
  onError,
}: {
  machineId: string;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [cash, setCash] = useState('');
  const [card, setCard] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await apiFetch('/collections', {
        method: 'POST',
        body: { machineId, cashAmount: Number(cash || 0), cardAmount: Number(card || 0) },
      });
      setCash('');
      setCard('');
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'No se pudo registrar');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="font-medium text-text mb-3">Dinero recogido</p>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step="0.01"
          className="input"
          placeholder="Efectivo"
          value={cash}
          onChange={(e) => setCash(e.target.value)}
        />
        <input
          type="number"
          min={0}
          step="0.01"
          className="input"
          placeholder="Tarjeta"
          value={card}
          onChange={(e) => setCard(e.target.value)}
        />
      </div>
      <button onClick={save} disabled={busy} className="btn-secondary press w-full mt-2">
        Registrar
      </button>
    </div>
  );
}
