function getBaseUrl(): string {
  if ((window as any).__BACKEND_PORT__) {
    return `http://localhost:${(window as any).__BACKEND_PORT__}/api`;
  }
  return '/api';
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
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
