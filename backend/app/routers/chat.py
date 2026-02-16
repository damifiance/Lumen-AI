import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import AskRequest, ConversationRequest, ModelInfo
from app.services.context_service import (
    build_ask_prompt,
    build_paper_prompt,
    prepare_paper_context,
)
from app.services.llm_service import (
    get_available_models,
    stream_completion_with_tracking,
)
from app.services.subscription_service import (
    check_token_limit,
    get_allowed_models,
    get_user_subscription,
    is_model_allowed,
)
from app.utils.auth import get_optional_user_id

router = APIRouter()
logger = logging.getLogger(__name__)


def _resolve_model(model: str) -> str:
    if not model or model == "auto":
        available = get_available_models()
        if available:
            return available[0]["id"]
        raise HTTPException(
            status_code=422,
            detail="No models available. Make sure Ollama is running or set API keys in backend/.env",
        )
    return model


async def _check_cloud_access(user_id: str | None, model: str):
    """Enforce tier-based gating for cloud models. Raises HTTPException if denied."""
    if model.startswith("ollama/"):
        return  # Local models always allowed

    if not user_id:
        raise HTTPException(status_code=403, detail="Sign in required to use cloud models")

    sub = await get_user_subscription(user_id)
    if not sub:
        raise HTTPException(status_code=403, detail="Sign in required to use cloud models")

    tier = sub.get("tier", "basic")

    if not is_model_allowed(tier, model):
        raise HTTPException(
            status_code=403,
            detail=f"Model {model} requires a higher subscription tier",
        )

    if not check_token_limit(sub):
        raise HTTPException(
            status_code=429,
            detail="Monthly token limit reached. Purchase a top-up or upgrade your plan.",
        )


@router.get("/models", response_model=list[ModelInfo])
async def list_models(user_id: str | None = Depends(get_optional_user_id)):
    all_models = get_available_models()

    if not user_id:
        # Unauthenticated: return all models but mark cloud ones as locked
        return [
            ModelInfo(**m, locked=not m["id"].startswith("ollama/"))
            for m in all_models
        ]

    sub = await get_user_subscription(user_id)
    tier = sub.get("tier", "basic") if sub else "basic"
    allowed = get_allowed_models(tier)

    return [
        ModelInfo(
            **m,
            locked=not m["id"].startswith("ollama/") and m["id"] not in allowed,
        )
        for m in all_models
    ]


@router.post("/ask")
async def ask_about_selection(
    request: AskRequest,
    user_id: str | None = Depends(get_optional_user_id),
):
    model = _resolve_model(request.model)
    await _check_cloud_access(user_id, model)

    try:
        paper_context = prepare_paper_context(
            request.paper_path, request.selected_text
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF file not found")
    except Exception as e:
        logger.exception("Failed to prepare paper context")
        raise HTTPException(status_code=500, detail=f"Failed to read PDF: {e}")

    system_msg = build_ask_prompt(paper_context)
    user_msg = f"Selected passage:\n\n> {request.selected_text}\n\nQuestion: {request.question}"

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]

    async def event_generator():
        try:
            async for token in stream_completion_with_tracking(model, messages, user_id):
                yield {"event": "token", "data": json.dumps({"content": token})}
            yield {"event": "done", "data": "{}"}
        except Exception as e:
            logger.exception("LLM streaming error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())


@router.post("/conversation")
async def chat_conversation(
    request: ConversationRequest,
    user_id: str | None = Depends(get_optional_user_id),
):
    model = _resolve_model(request.model)
    await _check_cloud_access(user_id, model)

    try:
        paper_context = prepare_paper_context(
            request.paper_path,
            request.messages[-1].content if request.messages else None,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="PDF file not found")
    except Exception as e:
        logger.exception("Failed to prepare paper context")
        raise HTTPException(status_code=500, detail=f"Failed to read PDF: {e}")

    system_msg = build_paper_prompt(paper_context)
    messages = [{"role": "system", "content": system_msg}]
    messages.extend(
        {"role": m.role, "content": m.content} for m in request.messages
    )

    async def event_generator():
        try:
            async for token in stream_completion_with_tracking(model, messages, user_id):
                yield {"event": "token", "data": json.dumps({"content": token})}
            yield {"event": "done", "data": "{}"}
        except Exception as e:
            logger.exception("LLM streaming error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())
