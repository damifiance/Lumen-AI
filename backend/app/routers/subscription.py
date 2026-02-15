from fastapi import APIRouter, Depends

from app.services.subscription_service import get_user_subscription
from app.utils.auth import get_required_user_id

router = APIRouter()


@router.get("/status")
async def subscription_status(user_id: str = Depends(get_required_user_id)):
    sub = await get_user_subscription(user_id)
    if not sub:
        return {
            "tier": "basic",
            "status": "active",
            "token_limit": 0,
            "tokens_used": 0,
            "topup_tokens": 0,
        }

    return {
        "tier": sub.get("tier", "basic"),
        "status": sub.get("status", "active"),
        "token_limit": sub.get("token_limit", 0),
        "tokens_used": sub.get("tokens_used", 0),
        "topup_tokens": sub.get("topup_tokens", 0),
        "period_start": sub.get("period_start"),
        "period_end": sub.get("period_end"),
    }
