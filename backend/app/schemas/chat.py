from pydantic import BaseModel


class ChatMessageSchema(BaseModel):
    role: str
    content: str


class AskRequest(BaseModel):
    paper_path: str
    selected_text: str
    question: str = "Explain this passage."
    model: str = "auto"


class ConversationRequest(BaseModel):
    paper_path: str
    messages: list[ChatMessageSchema]
    model: str = "auto"


class ModelInfo(BaseModel):
    id: str
    name: str
    provider: str
    locked: bool = False
