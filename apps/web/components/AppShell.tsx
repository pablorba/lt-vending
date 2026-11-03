'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogoMark } from './Logo';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

// Las pestañas de VendingNav (la-terraza-pos) son aquí el menú principal:
// este sistema es nada más la parte de vending.
const NAV = [
  { href: '/dashboard', label: 'Tablero' },
  { href: '/llenar', label: 'Qué llenar' },
  { href: '/surtir', label: 'Surtir' },
  { href: '/cortes', label: 'Cortes' },
  { href: '/merma', label: 'Merma' },
  { href: '/planograma', label: 'Planograma' },
  { href: '/maquinas', label: 'Máquinas' },
  { href: '/productos', label: 'Productos' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace('/login');
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated || !isAuthenticated) return null;

  function doLogout() {
    logout();
    router.push('/login');
  }

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="bg-ink text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-3 sm:px-6 h-14 flex items-center gap-3 md:gap-6">
          <Link href="/dashboard" aria-label="LT Vending — ir al tablero" className="flex items-center gap-2.5 shrink-0 text-white">
            <LogoMark className="h-7 w-auto" />
            <span className="font-display text-[17px] font-medium hidden sm:inline">LT Vending</span>
          </Link>

          <nav className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
            {NAV.map((n) => {
              const active = n.href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={cn(
                    'h-10 px-3.5 inline-flex items-center rounded-full text-sm font-medium whitespace-nowrap transition',
                    active ? 'bg-white/10 text-accent-light' : 'text-white/75 hover:text-white hover:bg-white/5',
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:flex items-center gap-2 shrink-0">
            <span className="text-sm text-white/60">{user?.name}</span>
            <button
              onClick={doLogout}
              className="text-sm text-white/80 hover:text-white px-3 py-1 rounded-md hover:bg-white/5"
            >
              Salir
            </button>
          </div>
          <button
            onClick={doLogout}
            aria-label="Salir"
            className="md:hidden shrink-0 text-sm text-white/80 hover:text-white px-2 py-1"
          >
            Salir
          </button>
        </div>
      </header>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
