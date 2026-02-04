import { apiFetch } from './client';
import type { FileEntry, RootEntry } from '../types/file';

export function getRoots(): Promise<RootEntry[]> {
  return apiFetch('/files/roots');
}

export function browseDirectory(path: string): Promise<FileEntry[]> {
  return apiFetch(`/files/browse?path=${encodeURIComponent(path)}`);
}
