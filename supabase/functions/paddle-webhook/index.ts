import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET")!;

const TIER_CONFIG: Record<string, { tier: string; token_limit: number }> = {
  [Deno.env.get("PADDLE_PRICE_PRO")!]: { tier: "pro", token_limit: 500_000 },
  [Deno.env.get("PADDLE_PRICE_MAX")!]: { tier: "max", token_limit: 2_000_000 },
};

const TOPUP_PRICE_ID = Deno.env.get("PADDLE_PRICE_TOPUP")!;
const TOPUP_TOKENS = 250_000;

// --- Signature verification ---

async function verifyPaddleSignature(
  signature: string,
  body: string,
  secret: string,
): Promise<boolean> {
  const matchTs = signature.match(/ts=(\d+)/);
  const matchH1 = signature.match(/h1=([a-f0-9]+)/);
  if (!matchTs || !matchH1) return false;

  const ts = matchTs[1];
  const h1 = matchH1[1];
  const payload = `${ts}:${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hex === h1;
}

// --- Main handler ---

serve(async (req: Request) => {
  const signature = req.headers.get("Paddle-Signature");
  if (!signature) {
    return new Response("Missing Paddle-Signature", { status: 400 });
  }

  const body = await req.text();

  const valid = await verifyPaddleSignature(signature, body, PADDLE_WEBHOOK_SECRET);
  if (!valid) {
    console.error("Webhook signature verification failed");
    return new Response("Invalid signature", { status: 401 });
  }

  const event = JSON.parse(body);

  try {
    switch (event.event_type) {
      case "subscription.created":
      case "subscription.activated":
      case "subscription.updated":
        await handleSubscriptionUpsert(event.data);
        break;
      case "subscription.canceled":
        await handleSubscriptionCanceled(event.data);
        break;
      case "subscription.past_due":
        await handleSubscriptionPastDue(event.data);
        break;
      case "transaction.completed":
        await handleTransactionCompleted(event.data);
        break;
      default:
        console.log(`Unhandled event: ${event.event_type}`);
    }
  } catch (err) {
    console.error(`Error handling ${event.event_type}:`, err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// --- Handlers ---

async function handleSubscriptionUpsert(data: any) {
  const customerId = data.customer_id;

  // Look up user by Paddle customer ID
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) {
    console.error("No user found for Paddle customer:", customerId);
    return;
  }

  const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
  const config = priceId ? TIER_CONFIG[priceId] : null;
  if (!config) {
    console.error("Unknown price:", priceId);
    return;
  }

  const period = data.current_billing_period;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      payment_provider: "paddle",
      provider_customer_id: customerId,
      provider_subscription_id: data.id,
      tier: config.tier,
      status: data.status === "active" || data.status === "trialing" ? "active" : data.status,
      token_limit: config.token_limit,
      period_start: period?.starts_at,
      period_end: period?.ends_at,
    },
    { onConflict: "user_id" },
  );
}

async function handleSubscriptionCanceled(data: any) {
  await supabase
    .from("subscriptions")
    .update({ status: "canceled", tier: "basic", token_limit: 0 })
    .eq("provider_subscription_id", data.id);
}

async function handleSubscriptionPastDue(data: any) {
  await supabase
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("provider_subscription_id", data.id);
}

async function handleTransactionCompleted(data: any) {
  // Check if this is a top-up purchase (one-time transaction, not subscription)
  if (data.subscription_id) return; // Skip subscription transactions

  const priceId = data.items?.[0]?.price?.id || data.items?.[0]?.price_id;
  if (priceId !== TOPUP_PRICE_ID) return;

  const customerId = data.customer_id;
  const userId = await getUserIdByCustomer(customerId);
  if (!userId) return;

  // Get current period
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("period_start")
    .eq("user_id", userId)
    .single();

  if (!sub) return;

  await supabase.rpc("increment_topup_tokens", {
    p_user_id: userId,
    p_period_start: sub.period_start,
    p_tokens: TOPUP_TOKENS,
  });

  await supabase.from("token_transactions").insert({
    user_id: userId,
    amount: TOPUP_TOKENS,
    type: "topup",
    description: "Token top-up purchase (250K)",
  });
}

// --- Helpers ---

async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("provider_customer_id", customerId)
    .single();

  return data?.user_id || null;
}
