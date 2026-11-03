'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { apiFetch } from '@/lib/api';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  price: string;
  cost: string;
  isActive: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    apiFetch<Product[]>('/products').then(setProducts).catch(() => setProducts([]));
  }

  useEffect(load, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !price || !cost) return;
    setBusy(true);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: { name, sku: sku || undefined, price: Number(price), cost: Number(cost) },
      });
      setName('');
      setSku('');
      setPrice('');
      setCost('');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el producto');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="reveal-line [--i:0] text-lg font-semibold text-text mb-4">Productos</h1>

      <form onSubmit={onSubmit} className="reveal-line [--i:1] card p-4 mb-6 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input
          className="input sm:col-span-2"
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input className="input" placeholder="SKU (opcional)" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          placeholder="Precio (MXN)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <input
          className="input"
          type="number"
          step="0.01"
          min="0"
          placeholder="Costo (MXN)"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        />
        <button type="submit" disabled={busy} className="btn-primary press sm:col-span-5">
          Agregar producto
        </button>
        {error && <p className="text-sm text-danger sm:col-span-5">{error}</p>}
      </form>

      {products === null ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-muted">Todavía no tienes productos.</p>
      ) : (
        <div className="scroll-rise card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-muted text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Producto</th>
                <th className="px-4 py-2 font-medium">SKU</th>
                <th className="px-4 py-2 font-medium">Precio</th>
                <th className="px-4 py-2 font-medium">Costo</th>
                <th className="px-4 py-2 font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => {
                const price = Number(p.price);
                const cost = Number(p.cost);
                const margin = price > 0 ? Math.round(((price - cost) / price) * 100) : 0;
                return (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className="px-4 py-2 text-text font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-muted">{p.sku ?? '—'}</td>
                    <td className="px-4 py-2 text-text">${price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-muted">${cost.toFixed(2)}</td>
                    <td className="px-4 py-2 text-positive">{margin}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
