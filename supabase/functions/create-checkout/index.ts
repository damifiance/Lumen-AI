import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const serviceClient = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_ENV = Deno.env.get("PADDLE_ENV") || "sandbox"; // "sandbox" or "production"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify Supabase JWT — create a per-request client with the user's token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    // Create a client that uses the user's JWT to verify identity
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError?.message, "token length:", token.length);
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    const { provider, priceId, tier, mode } = await req.json();

    if (provider === "paddle") {
      return await handlePaddleCheckout(user, priceId, mode);
    } else if (provider === "portone") {
      // PortOne checkout happens client-side via IMP SDK
      // This endpoint just returns the merchant_uid and config
      return await handlePortOneCheckout(user, tier, mode);
    }

    return jsonResponse({ error: "Invalid provider" }, 400);
  } catch (err) {
    console.error("Checkout error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// --- Paddle: create transaction with checkout URL ---

async function handlePaddleCheckout(
  user: any,
  priceId: string,
  mode?: string,
) {
  if (!priceId) {
    return jsonResponse({ error: "Missing priceId" }, 400);
  }

  // Find or create Paddle customer
  let customerId: string | undefined;
  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("provider_customer_id")
    .eq("user_id", user.id)
    .eq("payment_provider", "paddle")
    .single();

  if (sub?.provider_customer_id) {
    customerId = sub.provider_customer_id;
  } else {
    // Create Paddle customer
    const baseUrl = PADDLE_ENV === "sandbox"
      ? "https://sandbox-api.paddle.com"
      : "https://api.paddle.com";

    const customerResp = await fetch(`${baseUrl}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        custom_data: { supabase_user_id: user.id },
      }),
    });

    const customerData = await customerResp.json();
    customerId = customerData.data?.id;

    // Store the customer mapping so webhook can find the user
    await serviceClient.from("subscriptions").upsert(
      {
        user_id: user.id,
        payment_provider: "paddle",
        provider_customer_id: customerId,
        tier: "basic",
        status: "incomplete",
        token_limit: 0,
      },
      { onConflict: "user_id" },
    );
  }

  // Create transaction
  const baseUrl = PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";

  const txnBody: any = {
    items: [{ price_id: priceId, quantity: 1 }],
    customer_id: customerId,
    custom_data: { supabase_user_id: user.id },
  };

  if (mode === "one_time") {
    txnBody.collection_mode = "automatic";
  }

  const txnResp = await fetch(`${baseUrl}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(txnBody),
  });

  const txnData = await txnResp.json();
  const txnId = txnData.data?.id;

  if (!txnId) {
    console.error("No transaction ID in Paddle response:", txnData);
    return jsonResponse({ error: "Failed to create checkout" }, 500);
  }

  // Build checkout URL — points to our checkout page which loads Paddle.js
  const checkoutPage = Deno.env.get("CHECKOUT_PAGE_URL") || "https://damifiance.github.io/Lumen-AI/checkout.html";
  const checkoutUrl = `${checkoutPage}?_ptxn=${txnId}`;

  return jsonResponse({ url: checkoutUrl });
}

// --- PortOne: return config for client-side SDK ---

async function handlePortOneCheckout(
  user: any,
  tier: string,
  mode?: string,
) {
  const isTopup = mode === "topup";
  const timestamp = Date.now();

  const merchantUid = isTopup
    ? `topup_${user.id}_${timestamp}`
    : `sub_${user.id}_${tier}_${timestamp}`;

  const customerUid = `billing_${user.id}`;

  return jsonResponse({
    provider: "portone",
    merchant_uid: merchantUid,
    customer_uid: isTopup ? undefined : customerUid,
    imp_code: Deno.env.get("PORTONE_IMP_CODE"),
    pg: Deno.env.get("PORTONE_PG") || "html5_inicis",
  });
}

// --- Helpers ---

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
