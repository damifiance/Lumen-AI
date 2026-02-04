from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.highlight import Highlight
from app.schemas.highlight import HighlightCreate, HighlightResponse, HighlightUpdate

router = APIRouter()


@router.get("", response_model=list[HighlightResponse])
async def list_highlights(
    paper_path: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Highlight).where(Highlight.paper_path == paper_path)
    )
    highlights = result.scalars().all()
    return [
        HighlightResponse(
            id=h.id,
            paper_path=h.paper_path,
            content_text=h.content_text,
            position_json=h.position_json,
            color=h.color,
            comment=h.comment,
            created_at=h.created_at.isoformat(),
        )
        for h in highlights
    ]


@router.post("", response_model=HighlightResponse, status_code=201)
async def create_highlight(
    data: HighlightCreate,
    db: AsyncSession = Depends(get_db),
):
    highlight = Highlight(
        paper_path=data.paper_path,
        content_text=data.content_text,
        position_json=data.position_json,
        color=data.color,
        comment=data.comment,
    )
    db.add(highlight)
    await db.commit()
    await db.refresh(highlight)
    return HighlightResponse(
        id=highlight.id,
        paper_path=highlight.paper_path,
        content_text=highlight.content_text,
        position_json=highlight.position_json,
        color=highlight.color,
        comment=highlight.comment,
        created_at=highlight.created_at.isoformat(),
    )


@router.patch("/{highlight_id}", response_model=HighlightResponse)
async def update_highlight(
    highlight_id: str,
    data: HighlightUpdate,
    db: AsyncSession = Depends(get_db),
):
    highlight = await db.get(Highlight, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    if data.color is not None:
        highlight.color = data.color
    if data.comment is not None:
        highlight.comment = data.comment
    await db.commit()
    await db.refresh(highlight)
    return HighlightResponse(
        id=highlight.id,
        paper_path=highlight.paper_path,
        content_text=highlight.content_text,
        position_json=highlight.position_json,
        color=highlight.color,
        comment=highlight.comment,
        created_at=highlight.created_at.isoformat(),
    )


@router.delete("/{highlight_id}", status_code=204)
async def delete_highlight(
    highlight_id: str,
    db: AsyncSession = Depends(get_db),
):
    highlight = await db.get(Highlight, highlight_id)
    if not highlight:
        raise HTTPException(status_code=404, detail="Highlight not found")
    await db.delete(highlight)
    await db.commit()
