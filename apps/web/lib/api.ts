'use client';

import { useAuthStore } from './auth-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/** Fetch con el access token del store y un reintento tras renovar, si expiró. */
export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const run = async (): Promise<Response> => {
    const token = useAuthStore.getState().accessToken;
    return fetch(`${API_BASE}/api/v1${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let res = await run();

  if (res.status === 401 && useAuthStore.getState().refreshToken) {
    const result = await useAuthStore.getState().refreshTokens();
    if (result === 'ok') res = await run();
  }

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new ApiError(payload.message ?? `HTTP ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
