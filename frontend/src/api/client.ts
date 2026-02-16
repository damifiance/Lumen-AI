import { useAuthStore } from '../stores/authStore';

function getBaseUrl(): string {
  if ((window as any).__BACKEND_PORT__) {
    return `http://localhost:${(window as any).__BACKEND_PORT__}/api`;
  }
  return '/api';
}

function getAuthHeaders(): Record<string, string> {
  // Read token directly from auth store — no async, no supabase.auth.getSession()
  const session = useAuthStore.getState().session;
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = getAuthHeaders();
  const res = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`API error ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function apiStreamUrl(path: string): string {
  return `${getBaseUrl()}${path}`;
}

export { getAuthHeaders, getBaseUrl };
