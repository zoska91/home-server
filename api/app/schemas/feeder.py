from pydantic import BaseModel


class FeederEvent(BaseModel):
    type: str
