from pathlib import Path

import pymupdf


def extract_text(pdf_path: str, page_num: int | None = None) -> list[dict]:
    path = Path(pdf_path)
    if not path.exists() or path.suffix.lower() != ".pdf":
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = pymupdf.open(str(path))
    pages = []
    for i, page in enumerate(doc):
        if page_num is not None and i != page_num:
            continue
        text = page.get_text("text", sort=True)
        pages.append({"page_num": i, "text": text})
    doc.close()
    return pages


def get_metadata(pdf_path: str) -> dict:
    path = Path(pdf_path)
    if not path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    doc = pymupdf.open(str(path))
    meta = doc.metadata or {}
    page_count = len(doc)
    doc.close()

    return {
        "page_count": page_count,
        "title": meta.get("title", ""),
        "author": meta.get("author", ""),
        "subject": meta.get("subject", ""),
    }


def get_full_text(pdf_path: str) -> str:
    pages = extract_text(pdf_path)
    return "\n\n".join(p["text"] for p in pages)
