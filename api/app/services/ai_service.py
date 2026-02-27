import json
import os
import re
from google import genai
from app.utils.conversation_state import get_conversation_status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.models import Action
from app.prompts.get_action_type_prompt import get_action_type_prompt
from app.services.shopping_actions import (
    handle_add_to_shopping_list,
    handle_get_shopping_list,
    handle_clear_shopping_list,
    get_ai_reply,
    handle_create_new_product,
    handle_awaiting_confirm,
    handle_get_status_answer,
)
from colorama import Fore, Style


client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL")


async def handle_action(
    action: str, text: str, discord_id: str, db: AsyncSession
) -> str:
    if action == "add_to_shopping_list":
        return await handle_add_to_shopping_list(text, discord_id, db)
    elif action == "clear_shopping_list":
        return await handle_clear_shopping_list(db)
    elif action == "get_shopping_list":
        return await handle_get_shopping_list(db)
    elif action == "create_new_product":
        return await handle_create_new_product(text, discord_id, db)
    elif action == "get_status_answer":
        return await handle_get_status_answer(discord_id)
    else:
        return await get_ai_reply(text)


async def get_status_answer(message: str, discord_id: str, db: AsyncSession) -> dict:
    state = get_conversation_status(discord_id)
    reply = None

    if state:
        if state["state"] == "awaiting_confirm":
            reply = await handle_awaiting_confirm(
                message, discord_id, state["product_id"], db
            )
        elif state["state"] == "awaiting_new_product":
            reply = await handle_create_new_product(message, discord_id, db)

    print(Fore.CYAN + f"state: {state}, reply: {reply}" + Style.RESET_ALL)

    return reply


async def get_action_type(message: str, discord_id: str, db: AsyncSession) -> dict:
    status_answer = await get_status_answer(message, discord_id, db)

    if status_answer:
        return {"reply": status_answer}

    result = await db.execute(select(Action))
    actions = result.scalars().all()
    action_list = "\n".join([f"- {a.name}: {a.description}" for a in actions])

    aiResponse = await client.aio.models.generate_content(
        model=model, contents=get_action_type_prompt(action_list, message)
    )

    text = re.sub(r"```(?:json)?\n?", "", aiResponse.text).strip()

    if not text:
        return {
            "reply": "Przepraszam, coś poszło nie tak w get_action_type. Spróbuj jeszcze raz."
        }

    action = json.loads(text).get("action", "none")
    print(Fore.RED + "AI action:" + str(action) + Style.RESET_ALL)

    respMessage = await handle_action(action, message, discord_id, db)

    return {"reply": respMessage}
