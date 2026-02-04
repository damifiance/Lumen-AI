import json

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.schemas.chat import AskRequest, ConversationRequest, ModelInfo
from app.services.context_service import (
    ASK_SYSTEM_PROMPT,
    PAPER_SYSTEM_PROMPT,
    prepare_paper_context,
)
from app.services.llm_service import get_available_models, stream_completion

router = APIRouter()


def _resolve_model(model: str) -> str:
    if model == "auto":
        available = get_available_models()
        if available:
            return available[0]["id"]
        raise ValueError("No models available. Install Ollama or set API keys.")
    return model


@router.get("/models", response_model=list[ModelInfo])
async def list_models():
    return [ModelInfo(**m) for m in get_available_models()]


@router.post("/ask")
async def ask_about_selection(request: AskRequest):
    paper_context = prepare_paper_context(request.paper_path, request.selected_text)

    system_msg = ASK_SYSTEM_PROMPT.format(paper_text=paper_context)
    user_msg = f"Selected passage:\n\n> {request.selected_text}\n\nQuestion: {request.question}"

    messages = [
        {"role": "system", "content": system_msg},
        {"role": "user", "content": user_msg},
    ]

    model = _resolve_model(request.model)

    async def event_generator():
        async for token in stream_completion(model, messages):
            yield {"event": "token", "data": json.dumps({"content": token})}
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())


@router.post("/conversation")
async def chat_conversation(request: ConversationRequest):
    paper_context = prepare_paper_context(
        request.paper_path,
        request.messages[-1].content if request.messages else None,
    )

    system_msg = PAPER_SYSTEM_PROMPT.format(paper_text=paper_context)
    messages = [{"role": "system", "content": system_msg}]
    messages.extend({"role": m.role, "content": m.content} for m in request.messages)

    model = _resolve_model(request.model)

    async def event_generator():
        async for token in stream_completion(model, messages):
            yield {"event": "token", "data": json.dumps({"content": token})}
        yield {"event": "done", "data": "{}"}

    return EventSourceResponse(event_generator())
