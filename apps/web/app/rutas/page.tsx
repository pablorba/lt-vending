'use client';

import { AppShell } from '@/components/AppShell';

export default function RoutesPage() {
  return (
    <AppShell>
      <h1 className="reveal-line [--i:0] text-lg font-semibold text-text mb-1">Rutas de surtido</h1>
      <p className="reveal-line [--i:1] text-sm text-muted mb-6">
        Planeación de visitas y tareas para surtidores.
      </p>
      <div className="scroll-rise card p-8 text-center">
        <p className="text-sm text-muted">Todavía no construida — viene en una siguiente fase.</p>
      </div>
    </AppShell>
  );
}
