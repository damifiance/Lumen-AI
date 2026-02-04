import { create } from 'zustand';
import type { PaperMetadata } from '../types/paper';

interface PaperState {
  activePaperPath: string | null;
  metadata: PaperMetadata | null;
  isLoading: boolean;
  setActivePaper: (path: string, metadata: PaperMetadata) => void;
  clearPaper: () => void;
  setLoading: (loading: boolean) => void;
}

export const usePaperStore = create<PaperState>((set) => ({
  activePaperPath: null,
  metadata: null,
  isLoading: false,
  setActivePaper: (path, metadata) =>
    set({ activePaperPath: path, metadata, isLoading: false }),
  clearPaper: () => set({ activePaperPath: null, metadata: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
