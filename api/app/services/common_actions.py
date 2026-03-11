from app.utils.conversation_state import get_conversation_status
from app.prompts.base_prompt import base_prompt
import os
from google import genai


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL") or "gemini-2.0-flash"


async def handle_get_status_answer(discord_id: str) -> str:
    state = get_conversation_status(discord_id)
    return state["state"] if state else "no_state"


async def get_ai_reply(text: str) -> str:
    prompt = f"{base_prompt}\n{text}"
    response = await client.aio.models.generate_content(model=model, contents=prompt)
    return (response.text or "").strip()
