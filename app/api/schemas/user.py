from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    discord_id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    discord_id: str
    username: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True