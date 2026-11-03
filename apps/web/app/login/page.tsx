'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

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
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-text mb-1">LT Vending</h1>
        <p className="text-sm text-muted mb-6">
          {mode === 'login' ? 'Entra a tu cuenta' : 'Crea la cuenta de tu operación'}
        </p>

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

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={busy} className="btn-primary btn-lg w-full">
            {busy ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="mt-4 text-sm text-accent hover:underline"
        >
          {mode === 'login' ? '¿Primera vez? Crea tu cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>
    </div>
  );
}
