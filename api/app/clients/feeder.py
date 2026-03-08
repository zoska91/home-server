import os
import httpx
from colorama import Fore, Style

FEEDER_BASE_URL = os.getenv("FEEDER_BASE_URL", "http://192.168.1.100")
FEEDER_STREAM_URL = os.getenv("FEEDER_STREAM_URL", "http://192.168.1.100/stream")


async def _feeder_post(endpoint: str, payload: dict) -> dict:
    """Generic POST to ESP32. Swap implementation here when infra changes."""
    url = f"{FEEDER_BASE_URL}{endpoint}"
    print(Fore.BLUE + f"[feeder_client] POST {url} | {payload}" + Style.RESET_ALL)
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        return response.json()


async def send_feed_command(duration_ms: int) -> dict:
    """Trigger motor for given duration in milliseconds."""
    return await _feeder_post(
        "/command", {"action": "feed", "duration_ms": duration_ms}
    )


async def send_light_on_command(duration_sec: int) -> dict:
    """Turn on LED for given duration in seconds. 0 = indefinite (until off command)."""
    return await _feeder_post(
        "/command", {"action": "light_on", "duration_sec": duration_sec}
    )


async def send_light_off_command() -> dict:
    """Turn off LED immediately."""
    return await _feeder_post("/command", {"action": "light_off"})


def get_stream_url() -> str:
    return FEEDER_STREAM_URL
