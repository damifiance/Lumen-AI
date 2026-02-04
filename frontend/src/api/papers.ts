import { apiFetch } from './client';
import type { PaperMetadata } from '../types/paper';

export function getPdfUrl(path: string): string {
  return `/api/papers/pdf?path=${encodeURIComponent(path)}`;
}

export function getPaperMetadata(path: string): Promise<PaperMetadata> {
  return apiFetch(`/papers/metadata?path=${encodeURIComponent(path)}`);
}
