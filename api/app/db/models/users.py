from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    discord_id = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    is_ai = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    display_name = Column(String)
    avatar = Column(String)
