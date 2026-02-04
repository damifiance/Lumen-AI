import { create } from 'zustand';
import type { PaperMetadata } from '../types/paper';

interface OpenTab {
  path: string;
  metadata: PaperMetadata;
}

interface PaperState {
  tabs: OpenTab[];
  activeTabIndex: number;
  isLoading: boolean;
  activePaperPath: string | null;
  metadata: PaperMetadata | null;
  openTab: (path: string, metadata: PaperMetadata) => void;
  closeTab: (index: number) => void;
  switchTab: (index: number) => void;
  setLoading: (loading: boolean) => void;
  // Compat aliases
  setActivePaper: (path: string, metadata: PaperMetadata) => void;
  clearPaper: () => void;
}

export const usePaperStore = create<PaperState>((set, get) => ({
  tabs: [],
  activeTabIndex: -1,
  isLoading: false,

  activePaperPath: null,
  metadata: null,

  openTab: (path, metadata) => {
    const { tabs } = get();
    const existingIndex = tabs.findIndex((t) => t.path === path);
    if (existingIndex >= 0) {
      const tab = tabs[existingIndex];
      set({
        activeTabIndex: existingIndex,
        activePaperPath: tab.path,
        metadata: tab.metadata,
        isLoading: false,
      });
    } else {
      const newTabs = [...tabs, { path, metadata }];
      set({
        tabs: newTabs,
        activeTabIndex: newTabs.length - 1,
        activePaperPath: path,
        metadata,
        isLoading: false,
      });
    }
  },

  closeTab: (index) => {
    const { tabs, activeTabIndex } = get();
    if (index < 0 || index >= tabs.length) return;
    const newTabs = tabs.filter((_, i) => i !== index);
    let newActiveIndex = activeTabIndex;
    if (newTabs.length === 0) {
      newActiveIndex = -1;
    } else if (index === activeTabIndex) {
      newActiveIndex = Math.min(index, newTabs.length - 1);
    } else if (index < activeTabIndex) {
      newActiveIndex = activeTabIndex - 1;
    }
    const activeTab = newActiveIndex >= 0 ? newTabs[newActiveIndex] : null;
    set({
      tabs: newTabs,
      activeTabIndex: newActiveIndex,
      activePaperPath: activeTab?.path ?? null,
      metadata: activeTab?.metadata ?? null,
    });
  },

  switchTab: (index) => {
    const { tabs } = get();
    if (index >= 0 && index < tabs.length) {
      const tab = tabs[index];
      set({
        activeTabIndex: index,
        activePaperPath: tab.path,
        metadata: tab.metadata,
      });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),

  // Compat: used by App.tsx
  setActivePaper: (path, metadata) => {
    get().openTab(path, metadata);
  },

  clearPaper: () => set({
    tabs: [],
    activeTabIndex: -1,
    activePaperPath: null,
    metadata: null,
  }),
}));
