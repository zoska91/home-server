from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base


class FeederMotorConfig(Base):
    __tablename__ = "feeder_motor_configs"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    duration_ms = Column(Integer)
    is_default = Column(Boolean, default=False)


class FeederLightConfig(Base):
    __tablename__ = "feeder_light_configs"
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    duration_sec = Column(Integer)
    is_default = Column(Boolean, default=False)
