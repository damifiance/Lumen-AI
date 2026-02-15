import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  /**
   * Initializes the auth store by loading persisted session and setting up auth listener.
   * Must be called once on app startup.
   */
  initialize: async () => {
    // Skip initialization if Supabase is not configured
    if (!import.meta.env.VITE_SUPABASE_URL) {
      set({ isInitialized: true });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to load session:', error);
        set({ isInitialized: true });
        return;
      }

      set({
        session: data.session,
        user: data.session?.user ?? null,
        isInitialized: true,
      });

      // Listen for auth state changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });

      // Listen for session tokens from web-based auth (via deep link from GitHub Pages)
      if (window.electron?.onAuthSession) {
        window.electron.onAuthSession(async ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              set({ error: error.message });
            } else if (data.session) {
              // Explicitly update store — onAuthStateChange may not fire for programmatic setSession
              set({ session: data.session, user: data.session.user });
            }
          } catch (err) {
            set({ error: 'Failed to restore session' });
          }
        });
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isInitialized: true });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
