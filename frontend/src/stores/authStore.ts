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
  signOut: () => Promise<void>;
  clearError: () => void;
  resetPassword: (newPassword: string) => Promise<{ error?: string }>;
  deleteAccount: (password: string) => Promise<{ error?: string }>;
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
      case 'otp_expired':
        return 'This link has expired. Please request a new one.';
      case 'same_password':
        return 'New password must be different from your current password.';
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

      // Listen for session tokens from web-based auth (via deep link from GitHub Pages)
      if (window.electron?.onAuthSession) {
        window.electron.onAuthSession(async ({ accessToken, refreshToken }: { accessToken: string; refreshToken: string }) => {
          try {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) {
              set({ error: translateAuthError(error) });
            }
            // Session update will be handled by onAuthStateChange
          } catch (err) {
            set({ error: translateAuthError(err) });
          }
        });
      }

      // Listen for OAuth callbacks from Electron main process (legacy — kept for compatibility)
      if (window.electron?.onOAuthCallback) {
        window.electron.onOAuthCallback(async ({ code, error: oauthError }: { code?: string; error?: string }) => {
          if (oauthError) {
            set({ error: `OAuth failed: ${oauthError}`, isLoading: false });
            return;
          }
          if (code) {
            try {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
            } catch (err) {
              set({ error: translateAuthError(err), isLoading: false });
            }
          }
        });
      }

      // Listen for auth deep links from Electron main process (email verification and password reset)
      if (window.electron?.onAuthDeepLink) {
        window.electron.onAuthDeepLink(async ({ tokenHash, type }: { tokenHash: string; type: string }) => {
          if (type === 'email') {
            try {
              const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
              if (error) {
                set({ error: translateAuthError(error) });
              }
            } catch (err) {
              set({ error: translateAuthError(err) });
            }
          } else if (type === 'recovery') {
            const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
            if (error) {
              set({ error: translateAuthError(error) });
            }
          }
        });
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isInitialized: true });
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

  /**
   * Reset password (for in-app password change when user has a valid session).
   */
  resetPassword: async (newPassword: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

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
   * Delete user account permanently.
   * Requires password confirmation for security.
   * Cascade deletes: avatar (Storage) -> profile (DB) -> auth record.
   */
  deleteAccount: async (password: string) => {
    const { user } = get();
    if (!user?.email) return { error: 'No user logged in' };

    set({ isLoading: true, error: null });
    try {
      // Re-authenticate to confirm password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        set({ isLoading: false });
        return { error: 'Incorrect password' };
      }

      // Call Electron main process to delete (requires service_role key)
      if (window.electron?.deleteUserAccount) {
        const result = await window.electron.deleteUserAccount(user.id);
        if (!result.success) {
          set({ isLoading: false });
          return { error: result.error || 'Deletion failed' };
        }
      } else {
        // Web fallback — can't delete without admin API
        set({ isLoading: false });
        return { error: 'Account deletion requires the desktop app' };
      }

      // Sign out locally
      await supabase.auth.signOut();
      set({ user: null, session: null, isLoading: false });
      return {};
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
      return { error: translated };
    }
  },
}));
