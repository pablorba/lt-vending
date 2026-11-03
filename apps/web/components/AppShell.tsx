'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { LtvSplash } from './LtvSplash';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/maquinas', label: 'Máquinas' },
  { href: '/productos', label: 'Productos' },
  { href: '/rutas', label: 'Rutas' },
];

// Variable de módulo (no de componente): solo se reinicia cuando el navegador
// vuelve a ejecutar el script desde cero (carga completa / recarga). Una
// navegación interna (<Link>) reutiliza el mismo módulo, así que el splash
// no se repite al cambiar de pestaña dentro de la app — solo al abrir o
// recargar, igual que en Vault.
let splashShownThisLoad = false;

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, hasHydrated } = useAuthStore();
  const showSplash = useRef(hasHydrated && !splashShownThisLoad);
  if (hasHydrated && !splashShownThisLoad) splashShownThisLoad = true;

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace('/login');
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-text">
              <Image src="/logo-icon.png" alt="" width={32} height={31} className="h-6 w-auto" priority />
              LT Vending
            </Link>
            <nav className="cascade flex gap-1">
              {NAV.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ '--i': i } as React.CSSProperties}
                  className={cn(
                    'press px-3 py-2 rounded-md text-sm font-medium',
                    pathname?.startsWith(item.href)
                      ? 'bg-accent-soft text-accent'
                      : 'text-muted hover:bg-surface-2 hover:text-text',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted">
            <span>{user?.name}</span>
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="btn-secondary press px-3 py-1.5 text-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>
      <main className={cn('max-w-5xl mx-auto px-4 py-6', showSplash.current && 'app-reveal')}>
        {children}
      </main>
      {showSplash.current && <LtvSplash />}
    </div>
  );
}
