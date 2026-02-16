import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_ENV = Deno.env.get("PADDLE_ENV") || "sandbox";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Invalid token" }, 401);
    }

    // Get subscription info
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("payment_provider, provider_customer_id, provider_subscription_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.provider_customer_id) {
      return jsonResponse({ error: "No billing account found" }, 404);
    }

    if (sub.payment_provider === "paddle") {
      return await handlePaddlePortal(sub.provider_customer_id, sub.provider_subscription_id);
    }

    // PortOne doesn't have a customer portal — cancellation is managed in-app
    return jsonResponse({
      provider: "portone",
      message: "Manage your subscription in the app settings",
    });
  } catch (err) {
    console.error("Portal error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

async function handlePaddlePortal(customerId: string, subscriptionId?: string) {
  const baseUrl = PADDLE_ENV === "sandbox"
    ? "https://sandbox-api.paddle.com"
    : "https://api.paddle.com";

  const body: any = {};
  if (subscriptionId) {
    body.subscription_ids = [subscriptionId];
  }

  const resp = await fetch(`${baseUrl}/customers/${customerId}/portal-sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  const portalUrl = data.data?.urls?.[0]?.general?.overview;

  if (!portalUrl) {
    console.error("No portal URL in Paddle response:", data);
    return jsonResponse({ error: "Failed to create portal session" }, 500);
  }

  return jsonResponse({ url: portalUrl });
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
