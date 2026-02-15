import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PORTONE_API_SECRET = Deno.env.get("PORTONE_API_SECRET")!;
const PORTONE_WEBHOOK_SECRET = Deno.env.get("PORTONE_WEBHOOK_SECRET")!;

const TIER_CONFIG: Record<string, { tier: string; token_limit: number; amount_krw: number }> = {
  pro: { tier: "pro", token_limit: 500_000, amount_krw: 13000 },
  max: { tier: "max", token_limit: 2_000_000, amount_krw: 52000 },
};

const TOPUP_AMOUNT_KRW = 6500;
const TOPUP_TOKENS = 250_000;

// --- Signature verification ---

async function verifySignature(
  payload: Record<string, unknown>,
  receivedHash: string,
  secret: string,
): Promise<boolean> {
  const { signature_hash: _, ...data } = payload;
  const sortedKeys = Object.keys(data).sort();
  const queryString = sortedKeys
    .map((key) => `${key}=${encodeURIComponent(String(data[key]))}`)
    .join("&");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return computed === receivedHash;
}

// --- Main handler ---

serve(async (req: Request) => {
  const body = await req.text();
  const payload = JSON.parse(body);

  // Verify webhook authenticity
  if (payload.signature_hash) {
    const valid = await verifySignature(payload, payload.signature_hash, PORTONE_WEBHOOK_SECRET);
    if (!valid) {
      console.error("PortOne webhook signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  try {
    // PortOne sends imp_uid (payment ID) and merchant_uid (our order ID)
    const impUid = payload.imp_uid;
    const merchantUid = payload.merchant_uid as string;

    if (!impUid || !merchantUid) {
      return new Response("Missing imp_uid or merchant_uid", { status: 400 });
    }

    // Verify payment with PortOne API
    const payment = await verifyPaymentWithPortOne(impUid);
    if (!payment) {
      return new Response("Failed to verify payment", { status: 400 });
    }

    // Parse merchant_uid format: "sub_{userId}_{tier}" or "topup_{userId}"
    if (merchantUid.startsWith("sub_")) {
      await handleSubscriptionPayment(merchantUid, payment);
    } else if (merchantUid.startsWith("topup_")) {
      await handleTopupPayment(merchantUid, payment);
    }
  } catch (err) {
    console.error("PortOne webhook error:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});

// --- Verify payment via PortOne API ---

async function verifyPaymentWithPortOne(impUid: string): Promise<any | null> {
  // Get access token
  const tokenResp = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: Deno.env.get("PORTONE_API_KEY"),
      imp_secret: PORTONE_API_SECRET,
    }),
  });
  const tokenData = await tokenResp.json();
  const accessToken = tokenData.response?.access_token;
  if (!accessToken) return null;

  // Get payment details
  const paymentResp = await fetch(`https://api.iamport.kr/payments/${impUid}`, {
    headers: { Authorization: accessToken },
  });
  const paymentData = await paymentResp.json();

  if (paymentData.response?.status !== "paid") {
    console.error("Payment not completed:", paymentData.response?.status);
    return null;
  }

  return paymentData.response;
}

// --- Handlers ---

async function handleSubscriptionPayment(merchantUid: string, payment: any) {
  // Format: sub_{userId}_{tier}_{timestamp}
  const parts = merchantUid.split("_");
  const userId = parts[1];
  const tierKey = parts[2];

  const config = TIER_CONFIG[tierKey];
  if (!config) {
    console.error("Unknown tier in merchant_uid:", tierKey);
    return;
  }

  // Verify amount matches expected price
  if (payment.amount !== config.amount_krw) {
    console.error(`Amount mismatch: expected ${config.amount_krw}, got ${payment.amount}`);
    return;
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Store billing key for recurring charges
  const billingKey = payment.customer_uid || null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      payment_provider: "portone",
      provider_customer_id: payment.customer_uid || payment.buyer_email,
      provider_subscription_id: merchantUid,
      tier: config.tier,
      status: "active",
      token_limit: config.token_limit,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      portone_billing_key: billingKey,
    },
    { onConflict: "user_id" },
  );

  // Schedule next month's charge if we have a billing key
  if (billingKey) {
    await scheduleNextCharge(userId, billingKey, tierKey, config.amount_krw, periodEnd);
  }
}

async function handleTopupPayment(merchantUid: string, payment: any) {
  // Format: topup_{userId}_{timestamp}
  const parts = merchantUid.split("_");
  const userId = parts[1];

  if (payment.amount !== TOPUP_AMOUNT_KRW) {
    console.error(`Top-up amount mismatch: expected ${TOPUP_AMOUNT_KRW}, got ${payment.amount}`);
    return;
  }

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

// --- Schedule next recurring charge ---

async function scheduleNextCharge(
  userId: string,
  customerUid: string,
  tierKey: string,
  amount: number,
  scheduleAt: Date,
) {
  const tokenResp = await fetch("https://api.iamport.kr/users/getToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imp_key: Deno.env.get("PORTONE_API_KEY"),
      imp_secret: PORTONE_API_SECRET,
    }),
  });
  const tokenData = await tokenResp.json();
  const accessToken = tokenData.response?.access_token;
  if (!accessToken) return;

  const merchantUid = `sub_${userId}_${tierKey}_${Date.now()}`;

  await fetch("https://api.iamport.kr/subscribe/payments/schedule", {
    method: "POST",
    headers: {
      Authorization: accessToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_uid: customerUid,
      schedules: [
        {
          merchant_uid: merchantUid,
          schedule_at: Math.floor(scheduleAt.getTime() / 1000),
          amount,
          name: `Lumen AI ${tierKey.charAt(0).toUpperCase() + tierKey.slice(1)} - Monthly`,
          currency: "KRW",
        },
      ],
    }),
  });
}
