import { create } from 'zustand';
import type { HighlightData } from '../types/highlight';
import * as highlightApi from '../api/highlights';

interface HighlightState {
  highlights: HighlightData[];
  isLoading: boolean;
  loadHighlights: (paperPath: string) => Promise<void>;
  addHighlight: (data: {
    paper_path: string;
    content_text: string;
    position_json: string;
    color: string;
    comment: string;
  }) => Promise<HighlightData>;
  removeHighlight: (id: string) => Promise<void>;
  updateHighlight: (id: string, data: { color?: string; comment?: string }) => Promise<void>;
  clearHighlights: () => void;
}

export const useHighlightStore = create<HighlightState>((set, get) => ({
  highlights: [],
  isLoading: false,

  loadHighlights: async (paperPath: string) => {
    set({ isLoading: true });
    try {
      const highlights = await highlightApi.getHighlights(paperPath);
      set({ highlights, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  addHighlight: async (data) => {
    const highlight = await highlightApi.createHighlight(data);
    set({ highlights: [...get().highlights, highlight] });
    return highlight;
  },

  removeHighlight: async (id: string) => {
    await highlightApi.deleteHighlight(id);
    set({ highlights: get().highlights.filter((h) => h.id !== id) });
  },

  updateHighlight: async (id, data) => {
    const updated = await highlightApi.updateHighlight(id, data);
    set({
      highlights: get().highlights.map((h) => (h.id === id ? updated : h)),
    });
  },

  clearHighlights: () => set({ highlights: [] }),
}));
