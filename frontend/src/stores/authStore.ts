import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthApiError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  pendingVerification: string | null;
  resetPasswordMode: boolean;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  resetPassword: (newPassword: string) => Promise<{ error?: string }>;
  verifyEmail: (tokenHash: string) => Promise<{ error?: string }>;
  resendVerification: (email: string) => Promise<{ error?: string }>;
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
  pendingVerification: null,
  resetPasswordMode: false,

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

      // Listen for OAuth callbacks from Electron main process
      if (window.electron?.onOAuthCallback) {
        window.electron.onOAuthCallback(async ({ code, error: oauthError }) => {
          if (oauthError) {
            set({ error: `OAuth failed: ${oauthError}`, isLoading: false });
            return;
          }
          if (code) {
            try {
              const { error } = await supabase.auth.exchangeCodeForSession(code);
              if (error) throw error;
              // Session update will be handled by onAuthStateChange
            } catch (err) {
              set({ error: translateAuthError(err), isLoading: false });
            }
          }
        });
      }

      // Listen for auth deep links from Electron main process (email verification and password reset)
      if (window.electron?.onAuthDeepLink) {
        window.electron.onAuthDeepLink(async ({ tokenHash, type }) => {
          if (type === 'email') {
            // Email verification
            await get().verifyEmail(tokenHash);
          } else if (type === 'recovery') {
            // Password reset — exchange token for session, then show reset form
            const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
            if (!error) {
              set({ resetPasswordMode: true });
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
   * Sign up a new user with email and password.
   * Returns an error object if signup fails.
   */
  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const isElectron = window.electron != null;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: isElectron ? 'lumenai://auth/confirm' : window.location.origin + '/auth/confirm'
        }
      });

      if (error) {
        const translated = translateAuthError(error);
        set({ error: translated, isLoading: false });
        return { error: translated };
      }

      set({ isLoading: false, pendingVerification: email });
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
   * Sign in with OAuth provider (Google or GitHub).
   * In Electron mode, opens OAuth URL in external browser and handles deep link callback.
   * In web mode, uses standard Supabase redirect behavior.
   */
  signInWithOAuth: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const isElectron = window.electron != null;

      if (isElectron) {
        // Generate OAuth URL with Supabase (skipBrowserRedirect = true)
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: 'lumenai://auth/callback',
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        // Open in external browser via Electron main process
        await window.electron!.startOAuth(data.url);
      } else {
        // Web mode: use default Supabase redirect behavior
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
      }
      set({ isLoading: false });
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
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
   * Request a password reset email.
   * Returns an error object if the request fails.
   */
  requestPasswordReset: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const isElectron = window.electron != null;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: isElectron ? 'lumenai://auth/reset' : window.location.origin + '/auth/reset'
      });

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
   * Reset password after clicking the reset link.
   * This only works when a valid session exists (created by reset link click).
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

      set({ isLoading: false, resetPasswordMode: false });
      return {};
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
      return { error: translated };
    }
  },

  /**
   * Verify email address using token from verification email.
   */
  verifyEmail: async (tokenHash: string) => {
    set({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });

      if (error) {
        const translated = translateAuthError(error);
        set({ error: translated, isLoading: false });
        return { error: translated };
      }

      set({ isLoading: false, pendingVerification: null });
      return {};
    } catch (err) {
      const translated = translateAuthError(err);
      set({ error: translated, isLoading: false });
      return { error: translated };
    }
  },

  /**
   * Resend verification email.
   */
  resendVerification: async (email: string) => {
    set({ isLoading: true, error: null });

    try {
      const isElectron = window.electron != null;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: isElectron ? 'lumenai://auth/confirm' : window.location.origin + '/auth/confirm'
        }
      });

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
}));
