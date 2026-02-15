-- Migration 007: Subscriptions, token usage, and token transactions
-- Purpose: Paid tier system — tracks subscriptions, enforces token limits, audits usage
-- Payment providers: Paddle (international) + PortOne (Korean)

-- ============================================================
-- 1. Subscriptions table
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_provider TEXT NOT NULL CHECK (payment_provider IN ('paddle', 'portone')),
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'pro', 'max')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete')),
  token_limit BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  -- PortOne-specific: billing key for recurring charges
  portone_billing_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_provider_customer ON subscriptions(provider_customer_id);

-- ============================================================
-- 2. Token usage table (one row per user per billing period)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  topup_tokens BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, period_start)
);

CREATE INDEX idx_token_usage_user_period ON token_usage(user_id, period_start);

-- ============================================================
-- 3. Token transactions table (audit log)
-- ============================================================
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('usage', 'topup', 'reset')),
  model TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_transactions_user ON token_transactions(user_id, created_at);

-- ============================================================
-- 4. Atomic token usage increment function
-- ============================================================
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id UUID,
  p_tokens BIGINT,
  p_model TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_new_total BIGINT;
BEGIN
  SELECT period_start, period_end
  INTO v_period_start, v_period_end
  FROM subscriptions
  WHERE user_id = p_user_id AND status = 'active';

  IF v_period_start IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for user %', p_user_id;
  END IF;

  INSERT INTO token_usage (user_id, period_start, period_end, tokens_used)
  VALUES (p_user_id, v_period_start, v_period_end, p_tokens)
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET
    tokens_used = token_usage.tokens_used + p_tokens,
    updated_at = now()
  RETURNING tokens_used INTO v_new_total;

  INSERT INTO token_transactions (user_id, amount, type, model, description)
  VALUES (p_user_id, p_tokens, 'usage', p_model, 'Chat completion');

  RETURN v_new_total;
END;
$$;

-- ============================================================
-- 5. Atomic top-up token increment function
-- ============================================================
CREATE OR REPLACE FUNCTION increment_topup_tokens(
  p_user_id UUID,
  p_period_start TIMESTAMPTZ,
  p_tokens BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE token_usage
  SET topup_tokens = topup_tokens + p_tokens, updated_at = now()
  WHERE user_id = p_user_id AND period_start = p_period_start;
END;
$$;

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own transactions"
  ON token_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages token usage"
  ON token_usage FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role manages transactions"
  ON token_transactions FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 7. Updated_at triggers
-- ============================================================
-- Reuse update_updated_at_column() from migration 006

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_token_usage_updated_at ON token_usage;
CREATE TRIGGER update_token_usage_updated_at
  BEFORE UPDATE ON token_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Migration complete
-- ============================================================
-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Create Paddle products (international) and PortOne channel (Korean)
-- 3. Deploy Edge Functions with provider API keys
