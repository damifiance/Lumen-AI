import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Tier → allowed model prefixes
TIER_MODELS = {
    "basic": [],  # Ollama only (no cloud models)
    "pro": ["openai/gpt-4o-mini"],
    "max": [
        "openai/gpt-4o",
        "openai/gpt-4o-mini",
        "anthropic/claude-sonnet-4-20250514",
        "anthropic/claude-haiku-4-20250414",
    ],
}


def _supabase_headers() -> dict:
    return {
        "apikey": settings.supabase_service_key,
        "Authorization": f"Bearer {settings.supabase_service_key}",
        "Content-Type": "application/json",
    }


async def get_user_subscription(user_id: str) -> dict | None:
    """Fetch user's subscription + current token usage from Supabase."""
    if not settings.supabase_url or not settings.supabase_service_key:
        return None

    url = f"{settings.supabase_url}/rest/v1/subscriptions"
    params = {"user_id": f"eq.{user_id}", "select": "*"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=_supabase_headers(), params=params, timeout=10)
        if resp.status_code != 200:
            logger.error("Failed to fetch subscription: %s", resp.text)
            return None

        rows = resp.json()
        if not rows:
            return {"tier": "basic", "status": "active", "token_limit": 0, "tokens_used": 0, "topup_tokens": 0}

        sub = rows[0]

        # Fetch current token usage
        usage = await _get_token_usage(client, user_id, sub.get("period_start"))
        sub["tokens_used"] = usage.get("tokens_used", 0)
        sub["topup_tokens"] = usage.get("topup_tokens", 0)

        return sub


async def _get_token_usage(client: httpx.AsyncClient, user_id: str, period_start: str | None) -> dict:
    if not period_start:
        return {"tokens_used": 0, "topup_tokens": 0}

    url = f"{settings.supabase_url}/rest/v1/token_usage"
    params = {
        "user_id": f"eq.{user_id}",
        "period_start": f"eq.{period_start}",
        "select": "tokens_used,topup_tokens",
    }

    resp = await client.get(url, headers=_supabase_headers(), params=params, timeout=10)
    if resp.status_code != 200 or not resp.json():
        return {"tokens_used": 0, "topup_tokens": 0}

    return resp.json()[0]


def get_allowed_models(tier: str) -> list[str]:
    """Return list of allowed cloud model IDs for a tier."""
    return TIER_MODELS.get(tier, [])


def is_model_allowed(tier: str, model_id: str) -> bool:
    """Check if a specific model is allowed for the tier."""
    # Ollama models are always allowed
    if model_id.startswith("ollama/"):
        return True
    return model_id in get_allowed_models(tier)


def check_token_limit(sub: dict) -> bool:
    """Return True if user is within their token limit (including top-ups)."""
    if sub["tier"] == "basic":
        return True  # No limit for local-only
    total_available = sub.get("token_limit", 0) + sub.get("topup_tokens", 0)
    return sub.get("tokens_used", 0) < total_available


async def record_token_usage(user_id: str, tokens: int, model: str) -> int | None:
    """Record token usage via Supabase RPC. Returns new total."""
    if not settings.supabase_url or not settings.supabase_service_key:
        return None

    url = f"{settings.supabase_url}/rest/v1/rpc/increment_token_usage"
    payload = {
        "p_user_id": user_id,
        "p_tokens": tokens,
        "p_model": model,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url, headers=_supabase_headers(), json=payload, timeout=10
        )
        if resp.status_code != 200:
            logger.error("Failed to record token usage: %s", resp.text)
            return None

        return resp.json()
