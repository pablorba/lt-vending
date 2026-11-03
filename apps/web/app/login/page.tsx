'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { LogoMark } from '@/components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [tenantName, setTenantName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(tenantName, name, email, password);
      }
      router.replace('/dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 py-10 bg-bone">
      <div className="w-full max-w-md">
        {/* Logo en vector y en tinta, directo sobre el fondo: el mismo que se arma en la apertura. */}
        <div className="flex items-center justify-center gap-2.5 mb-10 text-ink">
          <LogoMark className="h-10 w-auto" />
          <span className="font-display text-2xl font-medium">LT Vending</span>
        </div>

        <div className="card p-6 sm:p-8">
          <p className="eyebrow">Control de máquinas de vending</p>
          <h1 className="text-3xl font-display font-medium text-ink mb-6">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h1>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === 'register' && (
              <>
                <input
                  className="input"
                  placeholder="Nombre de tu operación"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </>
            )}
            <input
              className="input"
              type="email"
              placeholder="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="mt-4 text-sm text-accent-ink hover:underline"
          >
            {mode === 'login' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta'}
          </button>
        </div>
      </div>
    </main>
  );
}
