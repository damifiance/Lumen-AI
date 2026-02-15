import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Warn if Supabase is not configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured — auth features disabled');
}

// Use a placeholder URL when Supabase is not configured to avoid createClient throwing.
// All auth operations are guarded by the env var check in authStore.initialize().
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Not needed for Electron
      flowType: 'pkce', // Use PKCE flow for OAuth (more secure for native apps)
    },
  },
);
