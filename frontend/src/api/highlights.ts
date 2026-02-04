import { apiFetch } from './client';
import type { HighlightData } from '../types/highlight';

export function getHighlights(paperPath: string): Promise<HighlightData[]> {
  return apiFetch(`/highlights?paper_path=${encodeURIComponent(paperPath)}`);
}

export function createHighlight(data: {
  paper_path: string;
  content_text: string;
  position_json: string;
  color: string;
  comment: string;
}): Promise<HighlightData> {
  return apiFetch('/highlights', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateHighlight(
  id: string,
  data: { color?: string; comment?: string }
): Promise<HighlightData> {
  return apiFetch(`/highlights/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteHighlight(id: string): Promise<void> {
  return apiFetch(`/highlights/${id}`, { method: 'DELETE' }) as Promise<void>;
}
