from app.utils.conversation_state import get_conversation_status
import os
from google import genai


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL")


async def handle_get_status_answer(discord_id: str) -> str:
    state = get_conversation_status(discord_id)
    return state["state"] if state else "no_state"


async def get_ai_reply(text: str) -> str:
    response = await client.aio.models.generate_content(model=model, contents=text)
    return response.text.strip()
