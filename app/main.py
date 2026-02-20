from fastapi import FastAPI

app = FastAPI(title="Home API", version="0.1.1")

@app.get("/")
async def root(): 
    return {"message": "API works"}

@app.get("/health")
async def health():
    return {"status": "oky"}