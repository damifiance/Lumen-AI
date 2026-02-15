import { supabase } from '../lib/supabase';
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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke(fnName, {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) throw error;
  return data;
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
