from pydantic import BaseModel


class PageText(BaseModel):
    page_num: int
    text: str


class PaperText(BaseModel):
    pages: list[PageText]


class PaperMetadata(BaseModel):
    page_count: int
    title: str = ""
    author: str = ""
    subject: str = ""
