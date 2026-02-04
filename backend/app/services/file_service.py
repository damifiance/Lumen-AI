import os
from pathlib import Path

from app.config import settings
from app.schemas.file_browser import FileEntry, RootEntry


def get_roots() -> list[RootEntry]:
    home = Path.home()
    candidates = [
        ("Home", home),
        ("Documents", home / "Documents"),
        ("Downloads", home / "Downloads"),
        ("Desktop", home / "Desktop"),
    ]
    return [
        RootEntry(name=name, path=str(path))
        for name, path in candidates
        if path.exists()
    ]


def browse_directory(dir_path: str) -> list[FileEntry]:
    path = Path(dir_path).resolve()
    home = Path.home().resolve()

    if not str(path).startswith(str(home)):
        raise PermissionError("Access restricted to home directory")

    if not path.is_dir():
        raise FileNotFoundError(f"Directory not found: {path}")

    entries: list[FileEntry] = []
    try:
        for item in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            if item.name.startswith("."):
                continue
            if item.is_dir():
                entries.append(FileEntry(
                    name=item.name,
                    path=str(item),
                    is_dir=True,
                ))
            elif item.suffix.lower() == ".pdf":
                stat = item.stat()
                entries.append(FileEntry(
                    name=item.name,
                    path=str(item),
                    is_dir=False,
                    size=stat.st_size,
                    modified=stat.st_mtime,
                ))
    except PermissionError:
        pass

    return entries
