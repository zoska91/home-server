from fastapi import FastAPI
from app.db.database import engine, Base
from app.routers import users

app = FastAPI(title="Home API", version="0.1.1")

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


app.include_router(users.router)


@app.get("/")
async def root(): 
    return {"message": "API works"}

@app.get("/health")
async def health():
    return {"status": "oky"}