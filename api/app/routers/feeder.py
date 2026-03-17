import os
import httpx
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.feeder_actions import handle_feed_cat_default
from app.clients.feeder import get_stream_url
from app.schemas.feeder import FeederEvent
from app.utils.feeder_messages import EVENT_MESSAGES
from datetime import datetime, timedelta

router = APIRouter(prefix="/feeder", tags=["feeder"])

_last_api_error: datetime | None = None

DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
DISCORD_ALERT_CHANNEL_ID = int(os.getenv("DISCORD_ALERT_CHANNEL_ID", "0"))


async def send_discord_message(
    content: str, file_bytes: bytes | None = None, filename: str = "snapshot.jpg"
):
    """Push a message (optionally with image) to Discord channel via REST."""
    headers = {"Authorization": f"Bot {DISCORD_TOKEN}"}
    url = f"https://discord.com/api/v10/channels/{DISCORD_ALERT_CHANNEL_ID}/messages"

    async with httpx.AsyncClient() as client:
        if file_bytes:
            files = {
                "file": (filename, file_bytes, "image/jpeg"),
                "payload_json": (None, f'{{"content": "{content}"}}'),
            }
            await client.post(url, headers=headers, files=files)
        else:
            await client.post(url, headers=headers, json={"content": content})


@router.post("/motion")
async def motion_detected(snapshot: UploadFile = File(...)):
    """
    Called by ESP32 when motion sensor triggers.
    Receives a JPEG snapshot and pushes alert + stream URL to Discord.
    """
    image_bytes = await snapshot.read()
    stream_url = get_stream_url()

    message = f"🐱 Wykryto ruch przy karmiku!\n📹 Podgląd na żywo: {stream_url}"

    try:
        await send_discord_message(content=message, file_bytes=image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discord push failed: {e}")

    return {"status": "ok"}


@router.post("/feed/default")
async def feed_default(db: AsyncSession = Depends(get_db)):
    """
    Trigger feeding with default config.
    Called by: NFC tag, Google Assistant webhook.
    No AI involved — straight to ESP32.
    """
    result = await handle_feed_cat_default(db)
    return {"status": "ok", "message": result}


@router.post("/event")
async def feeder_event(event: FeederEvent):
    global _last_api_error

    if event.type == "api_error":
        now = datetime.now()
        if _last_api_error and now - _last_api_error < timedelta(minutes=60 * 24):
            return {"status": "ok"}
        _last_api_error = now

    message = EVENT_MESSAGES.get(event.type, f"ℹ️ Karmnik: {event.type}")
    try:
        await send_discord_message(content=message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Discord push failed: {e}")
    return {"status": "ok"}


@router.get("/nfc")
async def feed_nfc(token: str, db: AsyncSession = Depends(get_db)):
    """GET endpoint for NFC tag — triggers default feeding."""
    if token != os.getenv("FEEDER_PASS_NFC"):
        raise HTTPException(status_code=403, detail="Forbidden")
    await handle_feed_cat_default(db)
    return {"status": "ok"}
