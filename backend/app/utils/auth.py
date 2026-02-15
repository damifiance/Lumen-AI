import logging

import jwt
from fastapi import Depends, HTTPException, Request

from app.config import settings

logger = logging.getLogger(__name__)


def _get_token(request: Request) -> str | None:
    """Extract Bearer token from Authorization header."""
    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        return None
    return auth[7:]


async def get_optional_user_id(request: Request) -> str | None:
    """Extract user_id from Supabase JWT. Returns None if no auth header."""
    token = _get_token(request)
    if not token:
        return None

    if not settings.supabase_jwt_secret:
        logger.warning("supabase_jwt_secret not configured, skipping auth")
        return None

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_required_user_id(request: Request) -> str:
    """Extract user_id from Supabase JWT. Raises 401 if not authenticated."""
    user_id = await get_optional_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
