from fastapi import FastAPI
from app.db.database import engine, Base
from app.routers.users import router as users_router
from app.routers.shopping import router as shopping_router
from app.routers.ai import router as ai_router
from app.db.seed import seed

app = FastAPI(title="Home API", version="0.1.1")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await seed()


app.include_router(users_router)
app.include_router(shopping_router)
app.include_router(ai_router)


@app.get("/")
async def root():
    return {"message": "API works"}


@app.get("/health")
async def health():
    return {"status": "oky"}
