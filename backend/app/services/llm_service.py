import os
import httpx
from collections.abc import AsyncGenerator

from litellm import acompletion

from app.config import settings

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
    }

    if model.startswith("ollama/"):
        kwargs["api_base"] = settings.ollama_base_url

    response = await acompletion(**kwargs)
    async for chunk in response:
        content = chunk.choices[0].delta.content
        if content:
            yield content


def get_available_models() -> list[dict]:
    models = []

    # Cloud models (only if keys are configured)
    for m in CLOUD_MODELS:
        if m["provider"] == "openai" and settings.openai_api_key:
            models.append(m)
        elif m["provider"] == "anthropic" and settings.anthropic_api_key:
            models.append(m)

    # Local Ollama models (always check)
    models.extend(_get_ollama_models())

    return models
