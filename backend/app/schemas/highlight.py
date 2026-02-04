from pydantic import BaseModel


class HighlightCreate(BaseModel):
    paper_path: str
    content_text: str = ""
    position_json: str
    color: str = "#FFFF00"
    comment: str = ""


class HighlightUpdate(BaseModel):
    color: str | None = None
    comment: str | None = None


class HighlightResponse(BaseModel):
    id: str
    paper_path: str
    content_text: str
    position_json: str
    color: str
    comment: str
    created_at: str

    model_config = {"from_attributes": True}
