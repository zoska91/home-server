import select

from api.app.db.models.users import User
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.ai_service import get_action_type

router = APIRouter(prefix="/ai", tags=["ai"])


class MessageRequest(BaseModel):
    text: str
    discord_id: str


class MessageResponse(BaseModel):
    reply: str


@router.post("/message", response_model=MessageResponse)
async def handle_message(request: MessageRequest, db: AsyncSession = Depends(get_db)):

    result = await db.execute(select(User).where(User.discord_id == request.discord_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_ai:
        return {"reply": "Nie masz dostępu do AI."}

    result = await get_action_type(request.text, request.discord_id, db)
    return result
