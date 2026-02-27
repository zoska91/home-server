from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.db.models import User
from app.schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.discord_id == user.discord_id))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        return existing_user

    new_user = User(
        discord_id=user.discord_id,
        username=user.username,
        display_name=user.display_name,
        avatar=user.avatar,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.get("/{discord_id}", response_model=UserResponse)
async def get_user(discord_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.discord_id == discord_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User is not existing")

    return user
