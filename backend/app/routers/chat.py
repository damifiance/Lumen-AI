import json
import logging
import os

from fastapi import APIRouter, HTTPException
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import AskRequest, ConversationRequest, ModelInfo
from app.services.context_service import (
    build_ask_prompt,
    build_paper_prompt,
    prepare_paper_context,
)
from app.services.llm_service import get_available_models, stream_completion

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


@router.get("/models", response_model=list[ModelInfo])
async def list_models():
    return [ModelInfo(**m) for m in get_available_models()]


@router.post("/ask")
async def ask_about_selection(request: AskRequest):
    model = _resolve_model(request.model)

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
            async for token in stream_completion(model, messages):
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
async def chat_conversation(request: ConversationRequest):
    model = _resolve_model(request.model)

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
            async for token in stream_completion(model, messages):
                yield {"event": "token", "data": json.dumps({"content": token})}
            yield {"event": "done", "data": "{}"}
        except Exception as e:
            logger.exception("LLM streaming error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_generator())
