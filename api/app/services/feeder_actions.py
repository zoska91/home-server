import json
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import FeederMotorConfig, FeederLightConfig
from app.prompts.feeder_prompt import (
    get_feed_cat_prompt,
    get_turn_on_light_prompt,
)
from app.clients.feeder import (
    send_feed_command,
    send_light_on_command,
    send_light_off_command,
)
from google import genai
import os
from colorama import Fore, Style

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL")

ESP32_ERROR_MSG = "Nie udało się połączyć z karmikiem. Spróbuj ponownie."


async def handle_feed_cat(text: str, discord_id: str, db: AsyncSession) -> str:
    configs = (await db.execute(select(FeederMotorConfig))).scalars().all()
    if not configs:
        return "Brak skonfigurowanych porcji w bazie danych!"

    options_list = "\n".join([f"{c.name}" for c in configs])
    response = await client.aio.models.generate_content(
        model=model, contents=get_feed_cat_prompt(text, options_list)
    )
    print(Fore.GREEN + "AI response (feed_cat):" + str(response.text) + Style.RESET_ALL)
    data = json.loads(re.sub(r"```(?:json)?\n?", "", response.text).strip())

    config_name = data.get("config_name")
    matched = next((c for c in configs if c.name == config_name), None)
    if not matched:
        matched = next((c for c in configs if c.is_default), configs[0])

    try:
        await send_feed_command(duration_ms=matched.duration_ms)
        return f"Nakarmiono kotkę! Porcja: {matched.name} ({matched.duration_ms}ms) 🐱"
    except Exception as e:
        print(Fore.RED + f"[handle_feed_cat] {e}" + Style.RESET_ALL)
        return ESP32_ERROR_MSG


async def handle_feed_cat_default(db: AsyncSession) -> str:
    """NFC / Google Assistant — no AI, straight to ESP32 with default config."""
    config = (
        await db.execute(
            select(FeederMotorConfig).where(FeederMotorConfig.is_default == True)
        )
    ).scalar_one_or_none()

    if not config:
        return "Brak domyślnej konfiguracji porcji w bazie danych!"

    try:
        await send_feed_command(duration_ms=config.duration_ms)
        return f"Nakarmiono kotkę! Porcja domyślna: {config.name} ({config.duration_ms}ms) 🐱"
    except Exception as e:
        print(Fore.RED + f"[handle_feed_cat_default] {e}" + Style.RESET_ALL)
        return ESP32_ERROR_MSG


async def handle_turn_on_feeder_light(text: str, db: AsyncSession) -> str:
    configs = (await db.execute(select(FeederLightConfig))).scalars().all()
    if not configs:
        return "Brak skonfigurowanych trybów świateł w bazie danych!"

    options_list = "\n".join([f"{c.name}" for c in configs])
    response = await client.aio.models.generate_content(
        model=model, contents=get_turn_on_light_prompt(text, options_list)
    )
    print(Fore.GREEN + "AI response (light_on):" + str(response.text) + Style.RESET_ALL)
    data = json.loads(re.sub(r"```(?:json)?\n?", "", response.text).strip())

    config_name = data.get("config_name")
    matched = next((c for c in configs if c.name == config_name), None)
    if not matched:
        matched = next((c for c in configs if c.is_default), configs[0])

    try:
        await send_light_on_command(duration_sec=matched.duration_sec)
        if matched.duration_sec == 0:
            return "Włączono światło bez limitu czasowego 💡"
        return f"Włączono światło na {matched.duration_sec}s 💡"
    except Exception as e:
        print(Fore.RED + f"[handle_turn_on_feeder_light] {e}" + Style.RESET_ALL)
        return ESP32_ERROR_MSG


async def handle_turn_off_feeder_light(db: AsyncSession) -> str:
    try:
        await send_light_off_command()
        return "Wyłączono światło 🌙"
    except Exception as e:
        print(Fore.RED + f"[handle_turn_off_feeder_light] {e}" + Style.RESET_ALL)
        return ESP32_ERROR_MSG
