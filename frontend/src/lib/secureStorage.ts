/**
 * Custom storage adapter for Supabase that routes through Electron's secure storage IPC.
 * Falls back to localStorage in browser dev mode (when window.electron is unavailable).
 */

let hasWarned = false;

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (window.electron?.secureStore) {
      return window.electron.secureStore.get(key);
    }

    // Fallback for browser dev mode
    if (!hasWarned) {
      console.warn('Running without secure storage — using localStorage fallback');
      hasWarned = true;
    }
    return localStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (window.electron?.secureStore) {
      return window.electron.secureStore.set(key, value);
    }

    // Fallback for browser dev mode
    if (!hasWarned) {
      console.warn('Running without secure storage — using localStorage fallback');
      hasWarned = true;
    }
    localStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (window.electron?.secureStore) {
      return window.electron.secureStore.remove(key);
    }

    // Fallback for browser dev mode
    if (!hasWarned) {
      console.warn('Running without secure storage — using localStorage fallback');
      hasWarned = true;
    }
    localStorage.removeItem(key);
  },
};
