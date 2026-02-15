import { AlertTriangle, TrendingUp } from 'lucide-react';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { openUpgradeModal } from './UpgradeModal';

export function UsageWarningBanner() {
  const { tier, usagePercent, tokensUsed, tokenLimit, topupTokens } = useSubscriptionStore();

  // No warnings for basic tier or if no limit
  if (tier === 'basic' || tokenLimit <= 0) return null;
  if (usagePercent < 80) return null;

  const totalAvailable = tokenLimit + topupTokens;
  const remaining = Math.max(0, totalAvailable - tokensUsed);
  const remainingK = Math.round(remaining / 1000);

  if (usagePercent >= 100) {
    return (
      <div className="mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
        <AlertTriangle size={14} className="text-red-500 shrink-0" />
        <span className="text-xs text-red-700 flex-1">
          Token limit reached. Cloud models are paused.
        </span>
        <button
          onClick={openUpgradeModal}
          className="text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer whitespace-nowrap"
        >
          Buy top-up
        </button>
      </div>
    );
  }

  if (usagePercent >= 95) {
    return (
      <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
        <span className="text-xs text-amber-700 flex-1">
          {remainingK}K tokens remaining ({usagePercent}% used)
        </span>
        <button
          onClick={openUpgradeModal}
          className="text-xs font-semibold text-amber-600 hover:text-amber-800 cursor-pointer whitespace-nowrap"
        >
          Buy top-up
        </button>
      </div>
    );
  }

  // 80% warning
  return (
    <div className="mx-3 mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
      <TrendingUp size={14} className="text-blue-500 shrink-0" />
      <span className="text-xs text-blue-700 flex-1">
        {remainingK}K tokens remaining this month ({usagePercent}% used)
      </span>
    </div>
  );
}
