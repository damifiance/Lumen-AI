import { createClient } from '@supabase/supabase-js';
import { secureStorage } from './secureStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Warn if Supabase is not configured
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured — auth features disabled');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for Electron
    flowType: 'pkce', // Use PKCE flow for OAuth (more secure for native apps)
  },
});
