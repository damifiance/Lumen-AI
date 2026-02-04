from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse

from app.schemas.paper import PaperMetadata, PaperText, PageText
from app.services.pdf_service import extract_text, get_metadata

router = APIRouter()


@router.get("/pdf")
async def serve_pdf(path: str = Query(...)):
    pdf_path = Path(path)
    if not pdf_path.exists() or pdf_path.suffix.lower() != ".pdf":
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(str(pdf_path), media_type="application/pdf")


@router.get("/text", response_model=PaperText)
async def get_text(
    path: str = Query(...),
    page: int | None = Query(None, description="Specific page number (0-indexed)"),
):
    try:
        pages = extract_text(path, page_num=page)
        return PaperText(pages=[PageText(**p) for p in pages])
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/metadata", response_model=PaperMetadata)
async def get_paper_metadata(path: str = Query(...)):
    try:
        return PaperMetadata(**get_metadata(path))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
