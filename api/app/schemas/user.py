from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    discord_id: str
    username: str
    display_name: Optional[str] = None
    avatar: Optional[str] = None
    is_ai: Optional[bool] = False


class UserResponse(BaseModel):
    id: int
    discord_id: str
    username: str
    is_admin: bool
    created_at: datetime
    is_ai: bool

    class Config:
        from_attributes = True
