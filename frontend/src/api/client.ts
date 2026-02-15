import { supabase } from '../lib/supabase';

function getBaseUrl(): string {
  if ((window as any).__BACKEND_PORT__) {
    return `http://localhost:${(window as any).__BACKEND_PORT__}/api`;
  }
  return '/api';
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  } catch {
    // Auth not available
  }
  return {};
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const authHeaders = await getAuthHeaders();
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

export { getAuthHeaders };
