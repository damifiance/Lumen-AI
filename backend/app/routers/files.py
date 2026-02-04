from fastapi import APIRouter, HTTPException, Query

from app.schemas.file_browser import FileEntry, RootEntry
from app.services.file_service import browse_directory, get_roots

router = APIRouter()


@router.get("/roots", response_model=list[RootEntry])
async def list_roots():
    return get_roots()


@router.get("/browse", response_model=list[FileEntry])
async def browse(path: str = Query(..., description="Directory path to browse")):
    try:
        return browse_directory(path)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
