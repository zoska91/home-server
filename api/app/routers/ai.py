from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.ai_service import get_action_type

router = APIRouter(prefix="/ai", tags=["ai"])

class MessageRequest(BaseModel):
    text: str

class MessageResponse(BaseModel):
    reply: str

@router.post("/message", response_model=MessageResponse)
async def handle_message(request: MessageRequest, db: AsyncSession = Depends(get_db)):
    result = await get_action_type(request.text, db)
    return result