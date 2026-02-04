import { create } from 'zustand';

const isMac = navigator.platform.toUpperCase().includes('MAC');

export interface ShortcutBinding {
  /** Display label, e.g. "Cmd+1" or "Ctrl+1" */
  label: string;
  /** The modifier key(s) to check */
  modifier: 'meta' | 'ctrl' | 'alt';
  /** The key to check (e.g. '1', 'w', '/', 'k') */
  key: string;
}

export interface ShortcutDef {
  id: string;
  description: string;
  binding: ShortcutBinding;
}

const STORAGE_KEY = 'lumen-keyboard-shortcuts';

function defaultBinding(key: string, macMod: 'meta' | 'ctrl' | 'alt' = 'alt', winMod: 'ctrl' | 'alt' = 'alt'): ShortcutBinding {
  const mod = isMac ? macMod : winMod;
  const modLabel = mod === 'meta' ? (isMac ? 'Cmd' : 'Meta') : mod === 'ctrl' ? 'Ctrl' : (isMac ? 'Option' : 'Alt');
  return { label: `${modLabel}+${key.toUpperCase()}`, modifier: mod, key };
}

function createDefaults(): ShortcutDef[] {
  return [
    { id: 'switch-tab-1', description: 'Switch to tab 1', binding: defaultBinding('1') },
    { id: 'switch-tab-2', description: 'Switch to tab 2', binding: defaultBinding('2') },
    { id: 'switch-tab-3', description: 'Switch to tab 3', binding: defaultBinding('3') },
    { id: 'switch-tab-4', description: 'Switch to tab 4', binding: defaultBinding('4') },
    { id: 'switch-tab-5', description: 'Switch to tab 5', binding: defaultBinding('5') },
    { id: 'switch-tab-6', description: 'Switch to tab 6', binding: defaultBinding('6') },
    { id: 'switch-tab-7', description: 'Switch to tab 7', binding: defaultBinding('7') },
    { id: 'switch-tab-8', description: 'Switch to tab 8', binding: defaultBinding('8') },
    { id: 'switch-tab-9', description: 'Switch to tab 9', binding: defaultBinding('9') },
    { id: 'close-tab', description: 'Close current tab', binding: defaultBinding('w') },
    { id: 'toggle-chat', description: 'Toggle chat panel', binding: defaultBinding('/') },
    { id: 'show-shortcuts', description: 'Show keyboard shortcuts', binding: defaultBinding('k') },
  ];
}

function loadShortcuts(): ShortcutDef[] {
  const defaults = createDefaults();
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaults;
    const overrides: Record<string, ShortcutBinding> = JSON.parse(saved);
    return defaults.map((def) => ({
      ...def,
      binding: overrides[def.id] ?? def.binding,
    }));
  } catch {
    return defaults;
  }
}

interface ShortcutState {
  shortcuts: ShortcutDef[];
  isOpen: boolean;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  updateBinding: (id: string, binding: ShortcutBinding) => void;
  resetAll: () => void;
  getBinding: (id: string) => ShortcutBinding | undefined;
  matchesEvent: (id: string, e: KeyboardEvent) => boolean;
}

export const useShortcutStore = create<ShortcutState>((set, get) => ({
  shortcuts: loadShortcuts(),
  isOpen: false,

  openShortcuts: () => set({ isOpen: true }),
  closeShortcuts: () => set({ isOpen: false }),

  updateBinding: (id, binding) => {
    const shortcuts = get().shortcuts.map((s) =>
      s.id === id ? { ...s, binding } : s
    );
    set({ shortcuts });
    // Save overrides
    const overrides: Record<string, ShortcutBinding> = {};
    shortcuts.forEach((s) => { overrides[s.id] = s.binding; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  },

  resetAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ shortcuts: createDefaults() });
  },

  getBinding: (id) => get().shortcuts.find((s) => s.id === id)?.binding,

  matchesEvent: (id, e) => {
    const binding = get().getBinding(id);
    if (!binding) return false;
    const modMatch =
      (binding.modifier === 'meta' && e.metaKey) ||
      (binding.modifier === 'ctrl' && e.ctrlKey) ||
      (binding.modifier === 'alt' && e.altKey);
    return modMatch && e.key.toLowerCase() === binding.key.toLowerCase();
  },
}));

/** Check if an event's modifier key is one used by any shortcut */
export function isShortcutModifier(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey || e.altKey;
}
