'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
}

export type RefreshResult = 'ok' | 'invalid' | 'network';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  // El store persistido tarda un instante en leer localStorage al cargar la
  // página (recarga completa / entrar por un link directo). Hasta que esto
  // sea true, isAuthenticated puede estar en falso aunque SÍ haya sesión
  // guardada — por eso nadie debe redirigir a /login antes de esto.
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (tenantName: string, name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshTokens: () => Promise<RefreshResult>;
}

// Renovación "single-flight": si llegan varias peticiones 401 a la vez, todas
// comparten UNA sola llamada de refresh (mismo criterio que la-terraza-pos).
let refreshInFlight: Promise<RefreshResult> | null = null;

async function authRequest(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? 'No se pudo completar la operación');
  }
  return res.json();
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      async login(email, password) {
        const data = await authRequest('/auth/login', { email, password });
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      async register(tenantName, name, email, password) {
        const data = await authRequest('/auth/register', { tenantName, name, email, password });
        set({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          isAuthenticated: true,
        });
      },

      logout() {
        const token = get().accessToken;
        const refreshToken = get().refreshToken;
        if (token) {
          fetch(`${API_BASE}/api/v1/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          }).catch(() => {});
        }
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      async refreshTokens() {
        if (refreshInFlight) return refreshInFlight;

        const run = (async (): Promise<RefreshResult> => {
          const refreshToken = get().refreshToken;
          if (!refreshToken) return 'invalid';
          try {
            const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (res.status === 401 || res.status === 403) return 'invalid';
            if (!res.ok) return 'network';
            const data = await res.json();
            set({
              user: data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
              isAuthenticated: true,
            });
            return 'ok';
          } catch {
            return 'network';
          }
        })();

        refreshInFlight = run;
        try {
          return await run;
        } finally {
          refreshInFlight = null;
        }
      },
    }),
    {
      name: 'ltv-auth',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
