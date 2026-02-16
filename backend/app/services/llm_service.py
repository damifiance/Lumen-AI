import logging
import os

import httpx
from collections.abc import AsyncGenerator

from litellm import acompletion

from app.config import settings

logger = logging.getLogger(__name__)

CLOUD_MODELS = [
    {"id": "openai/gpt-4o", "name": "GPT-4o", "provider": "openai"},
    {"id": "openai/gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai"},
    {"id": "anthropic/claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "provider": "anthropic"},
    {"id": "anthropic/claude-haiku-4-20250414", "name": "Claude Haiku", "provider": "anthropic"},
]


def ensure_api_keys():
    if settings.openai_api_key:
        os.environ.setdefault("OPENAI_API_KEY", settings.openai_api_key)
    if settings.anthropic_api_key:
        os.environ.setdefault("ANTHROPIC_API_KEY", settings.anthropic_api_key)


def _get_ollama_models() -> list[dict]:
    """Fetch locally available Ollama models."""
    try:
        resp = httpx.get(f"{settings.ollama_base_url}/api/tags", timeout=3)
        if resp.status_code == 200:
            data = resp.json()
            return [
                {
                    "id": f"ollama/{m['name']}",
                    "name": f"{m['name']} (local)",
                    "provider": "ollama",
                }
                for m in data.get("models", [])
            ]
    except (httpx.ConnectError, httpx.TimeoutException):
        pass
    return []


async def stream_completion(
    model: str,
    messages: list[dict],
    temperature: float = 0.3,
) -> AsyncGenerator[str, None]:
    ensure_api_keys()

    kwargs: dict = {
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": temperature,
        "stream_options": {"include_usage": True},
    }

    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_base_url
        kwargs.pop("stream_options", None)

    response = await acompletion(**kwargs)
    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content

        # Yield usage info from final chunk (if available)
        if hasattr(chunk, "usage") and chunk.usage:
            total = chunk.usage.total_tokens or 0
            if total > 0:
                yield f"\n__USAGE__:{total}"


async def stream_completion_with_tracking(
    model: str,
    messages: list[dict],
    user_id: str | None,
    temperature: float = 0.3,
) -> AsyncGenerator[str, None]:
    """Wraps stream_completion to track token usage for authenticated users."""
    from app.services.subscription_service import record_token_usage

    total_tokens = 0

    async for chunk in stream_completion(model, messages, temperature):
        # Intercept usage marker
        if chunk.startswith("\n__USAGE__:"):
            try:
                total_tokens = int(chunk.split(":")[1])
            except (ValueError, IndexError):
                pass
            continue
        yield chunk

    # Record usage after stream completes
    if user_id and total_tokens > 0 and not model.startswith("ollama/"):
        try:
            await record_token_usage(user_id, total_tokens, model)
        except Exception:
            logger.exception("Failed to record token usage")


def get_available_models() -> list[dict]:
    models = []

    # Cloud models — always listed (gating happens in chat router based on tier)
    for m in CLOUD_MODELS:
        if m["provider"] == "openai" and settings.openai_api_key:
            models.append(m)
        elif m["provider"] == "anthropic" and settings.anthropic_api_key:
            models.append(m)

    # Local Ollama models (always check)
    models.extend(_get_ollama_models())

    return models
