import { create } from 'zustand';
import { getSubscriptionStatus } from '../api/subscription';

interface SubscriptionState {
  tier: 'basic' | 'pro' | 'max';
  status: string;
  tokenLimit: number;
  tokensUsed: number;
  topupTokens: number;
  periodEnd: string | null;
  isLoading: boolean;
  usagePercent: number;
  fetchSubscription: () => Promise<void>;
  clearSubscription: () => void;
}

function calcUsagePercent(used: number, limit: number, topup: number): number {
  const total = limit + topup;
  if (total <= 0) return 0;
  return Math.min(100, Math.round((used / total) * 100));
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  tier: 'basic',
  status: 'active',
  tokenLimit: 0,
  tokensUsed: 0,
  topupTokens: 0,
  periodEnd: null,
  isLoading: false,
  usagePercent: 0,

  fetchSubscription: async () => {
    set({ isLoading: true });
    try {
      const data = await getSubscriptionStatus();
      set({
        tier: data.tier,
        status: data.status,
        tokenLimit: data.token_limit,
        tokensUsed: data.tokens_used,
        topupTokens: data.topup_tokens,
        periodEnd: data.period_end || null,
        usagePercent: calcUsagePercent(data.tokens_used, data.token_limit, data.topup_tokens),
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  clearSubscription: () => {
    set({
      tier: 'basic',
      status: 'active',
      tokenLimit: 0,
      tokensUsed: 0,
      topupTokens: 0,
      periodEnd: null,
      usagePercent: 0,
    });
  },
}));
