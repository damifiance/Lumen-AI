import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthApiError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

/**
 * Translates Supabase auth errors into user-friendly messages.
 */
function translateAuthError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const authError = error as AuthApiError;
    switch (authError.code) {
      case 'invalid_credentials':
        return 'Invalid email or password';
      case 'email_not_confirmed':
        return 'Please check your email and confirm your account first';
      case 'user_already_exists':
        return 'An account with this email already exists';
      case 'weak_password':
        return 'Password must be at least 6 characters';
      case 'over_email_send_rate_limit':
        return 'Too many attempts. Please wait a few minutes.';
      default:
        return 'Unable to complete request. Please try again.';
    }
  }
  return 'Network error. Please check your connection.';
}

export const useAuthStore = create<AuthState>((set, get) => ({
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
      // Load persisted session from secure storage
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
      // CRITICAL: Do NOT call any supabase.* methods inside this callback (deadlock bug)
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isInitialized: true });
    }
  },

  /**
   * Sign up a new user with email and password.
   * Returns an error object if signup fails.
   */
  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signUp({ email, password });

      if (error) {
        const translated = translateAuthError(error);
        set({ error: translated, isLoading: false });
        return { error: translated };
      }

      set({ isLoading: false });
      return {};
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
      return { error: translated };
    }
  },

  /**
   * Sign in an existing user with email and password.
   * Returns an error object if signin fails.
   */
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const translated = translateAuthError(error);
        set({ error: translated, isLoading: false });
        return { error: translated };
      }

      set({ isLoading: false });
      return {};
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
      return { error: translated };
    }
  },

  /**
   * Sign out the current user.
   */
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null });
    } catch (err) {
      console.error('Sign out error:', err);
    }
  },

  /**
   * Clear the current error message.
   */
  clearError: () => {
    set({ error: null });
  },
}));
