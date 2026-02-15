import { useState, useEffect } from 'react';
import { X, Check, Zap, Crown } from 'lucide-react';
import { createPaddleCheckout, getPortOneCheckoutConfig } from '../../api/subscription';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { useAuthStore } from '../../stores/authStore';

type Listener = (open: boolean) => void;
let _listener: Listener | null = null;

export function openUpgradeModal() {
  _listener?.(true);
}

// Pricing config per provider
const PADDLE_PRICES = {
  pro: import.meta.env.VITE_PADDLE_PRICE_PRO || '',
  max: import.meta.env.VITE_PADDLE_PRICE_MAX || '',
};

const PORTONE_PRICES_KRW = {
  pro: 13000,
  max: 52000,
  topup: 6500,
};

const TIERS = [
  {
    id: 'basic' as const,
    name: 'Basic',
    priceUsd: 'Free',
    priceKrw: 'Free',
    icon: Zap,
    features: ['Unlimited local AI (Ollama)', 'No sign-up required', 'All local models'],
    highlight: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    priceUsd: '$10/mo',
    priceKrw: '₩13,000/mo',
    icon: Zap,
    features: ['GPT-4o Mini access', '500K tokens/month', 'Token top-ups available'],
    highlight: true,
  },
  {
    id: 'max' as const,
    name: 'Max',
    priceUsd: '$40/mo',
    priceKrw: '₩52,000/mo',
    icon: Crown,
    features: ['All cloud models', '2M tokens/month', 'GPT-4o, Claude Sonnet & more', 'Token top-ups available'],
    highlight: false,
  },
];

// Detect if user is likely Korean based on browser language
function isKoreanUser(): boolean {
  const lang = navigator.language || '';
  return lang.startsWith('ko');
}

export function UpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tier = useSubscriptionStore((s) => s.tier);
  const user = useAuthStore((s) => s.user);
  const isKorean = isKoreanUser();

  useEffect(() => {
    _listener = setIsOpen;
    return () => { _listener = null; };
  }, []);

  useEffect(() => {
    if (isOpen) setError(null);
  }, [isOpen]);

  const handleUpgrade = async (tierId: 'pro' | 'max') => {
    if (!user) {
      window.open('https://damifiance.github.io/Lumen-AI/auth.html?source=app', '_blank');
      return;
    }

    setLoading(tierId);
    setError(null);

    try {
      if (isKorean) {
        await handlePortOneCheckout(tierId);
      } else {
        await handlePaddleCheckout(tierId);
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
    } finally {
      setLoading(null);
    }
  };

  const handlePaddleCheckout = async (tierId: 'pro' | 'max') => {
    const priceId = PADDLE_PRICES[tierId];
    if (!priceId) {
      setError('Paddle price not configured');
      return;
    }
    const url = await createPaddleCheckout(priceId);
    window.open(url, '_blank');
    setIsOpen(false);
  };

  const handlePortOneCheckout = async (tierId: 'pro' | 'max') => {
    const config = await getPortOneCheckoutConfig(tierId);
    const amount = PORTONE_PRICES_KRW[tierId];

    // Load PortOne IMP SDK if not loaded
    if (!(window as any).IMP) {
      setError('Payment SDK not loaded. Please refresh and try again.');
      return;
    }

    const IMP = (window as any).IMP;
    IMP.init(config.imp_code);

    IMP.request_pay(
      {
        pg: config.pg,
        pay_method: 'card',
        merchant_uid: config.merchant_uid,
        name: `Lumen AI ${tierId.charAt(0).toUpperCase() + tierId.slice(1)} - Monthly`,
        amount,
        currency: 'KRW',
        customer_uid: config.customer_uid,
        buyer_email: user?.email || '',
      },
      (response: any) => {
        if (response.success) {
          setIsOpen(false);
          // Refresh subscription status after successful payment
          useSubscriptionStore.getState().fetchSubscription();
        } else {
          setError(response.error_msg || 'Payment failed');
        }
      },
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[720px] max-w-[95vw] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 p-1 text-gray-300 hover:text-gray-500 cursor-pointer rounded-lg hover:bg-gray-100"
          >
            <X size={16} />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Choose Your Plan</h2>
          <p className="text-sm text-gray-400 mt-1">Unlock cloud AI models with a subscription</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Tier Cards */}
        <div className="px-6 pb-6 grid grid-cols-3 gap-4">
          {TIERS.map((t) => {
            const isCurrent = t.id === tier;
            const Icon = t.icon;
            const price = isKorean ? t.priceKrw : t.priceUsd;
            return (
              <div
                key={t.id}
                className={`relative rounded-xl border-2 p-5 flex flex-col ${
                  t.highlight
                    ? 'border-accent bg-accent/5'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-accent text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    Popular
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={t.highlight ? 'text-accent' : 'text-gray-400'} />
                  <span className="font-semibold text-gray-800">{t.name}</span>
                </div>

                <div className="text-2xl font-bold text-gray-900 mb-4">{price}</div>

                <ul className="space-y-2 mb-5 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="text-center text-sm font-medium text-gray-400 py-2">
                    Current plan
                  </div>
                ) : t.id === 'basic' ? (
                  <div className="text-center text-sm text-gray-300 py-2">Free forever</div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(t.id)}
                    disabled={loading === t.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                      t.highlight
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } disabled:opacity-50`}
                  >
                    {loading === t.id ? 'Processing...' : `Upgrade to ${t.name}`}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Top-up info */}
        {(tier === 'pro' || tier === 'max') && (
          <div className="px-6 pb-5">
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500">
                Need more tokens? Purchase top-ups for 250K tokens at{' '}
                {isKorean ? '₩6,500' : '$5'} each.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400">
            {isKorean
              ? 'Payments processed securely via PortOne. Cancel anytime.'
              : 'Payments processed securely via Paddle. Cancel anytime.'}
          </p>
        </div>
      </div>
    </div>
  );
}
