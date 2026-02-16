import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { apiFetch } from './client';

export interface SubscriptionStatus {
  tier: 'basic' | 'pro' | 'max';
  status: string;
  token_limit: number;
  tokens_used: number;
  topup_tokens: number;
  period_start?: string;
  period_end?: string;
}

export function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  return apiFetch('/subscription/status');
}

async function callEdgeFunction(fnName: string, body: Record<string, unknown>): Promise<any> {
  // Try auth store session first (already loaded from secure storage),
  // then fall back to getSession()
  // First try refreshing the session to ensure we have a valid token
  const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
  const storeSession = useAuthStore.getState().session;
  const session = refreshedSession || storeSession;
  if (!session) throw new Error('Not authenticated');
  console.log('[callEdgeFunction] token expires_at:', session.expires_at, 'now:', Math.floor(Date.now() / 1000));

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Edge Function returned a non-2xx status code: ${text}`);
  }

  return res.json();
}

// --- Paddle (international users) ---

export async function createPaddleCheckout(priceId: string, mode?: string): Promise<string> {
  const data = await callEdgeFunction('create-checkout', {
    provider: 'paddle',
    priceId,
    mode,
  });
  return data.url;
}

// --- PortOne (Korean users) ---

export interface PortOneCheckoutConfig {
  merchant_uid: string;
  customer_uid?: string;
  imp_code: string;
  pg: string;
}

export async function getPortOneCheckoutConfig(
  tier: string,
  mode?: string,
): Promise<PortOneCheckoutConfig> {
  return await callEdgeFunction('create-checkout', {
    provider: 'portone',
    tier,
    mode,
  });
}

// --- Portal (manage subscription) ---

export async function createPortalSession(): Promise<{ url?: string; provider: string }> {
  return await callEdgeFunction('create-portal', {});
}
