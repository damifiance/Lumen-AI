from pydantic import BaseModel


class FileEntry(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int = 0
    modified: float = 0.0


class RootEntry(BaseModel):
    name: str
    path: str
