import json
import os
import re

from colorama import Fore, Style
from google import genai
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.models import ShoppingListItem, ShoppingProduct
from app.prompts.shopping_prompt import (
    get_confirm_product_match_prompt,
    get_delete_product_prompt,
    get_new_product_prompt,
    get_product_match_prompt,
)
from app.utils.conversation_state import (
    clear_conversation_status,
    get_conversation_status,
    set_conversation_status,
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL") or "gemini-2.0-flash"


async def handle_add_to_shopping_list(
    message: str, discord_id: str, db: AsyncSession
) -> str:
    product_list_raw = await db.execute(select(ShoppingProduct))
    products = product_list_raw.scalars().all()
    product_list_text = "\n".join([f"- id:{p.id} {p.name}" for p in products])

    prompt = get_product_match_prompt(product_list_text, message)
    response = await client.aio.models.generate_content(model=model, contents=prompt)
    print(Fore.GREEN + "AI response:" + str(response.text) + Style.RESET_ALL)

    clean = re.sub(r"```(?:json)?\n?", "", response.text or "").strip()
    data = json.loads(clean)
    print(Fore.YELLOW + "AI data:" + str(data) + Style.RESET_ALL)

    if data.get("status") == "confirm":
        set_conversation_status(
            discord_id, {"state": "awaiting_confirm", "product_id": data["product_id"]}
        )
        return (
            f"Nie jestem pewna, czy '{message}' to wskazany produkt. "
            f"Czy chcesz dodać ten produkt do listy zakupów? (tak/nie)"
        )

    if data.get("status") == "not_found":
        set_conversation_status(
            discord_id, {"state": "awaiting_new_product", "attempts": 0}
        )
        return (
            "Nie znalazłam tego produktu. Jeśli chcesz dodać nowy produkt do bazy, "
            "podaj jego nazwę."
        )

    if data.get("status") == "found":
        product_id = data.get("product_id")
        if product_id is None:
            return "Nie udało się dopasować produktu. Spróbuj jeszcze raz."

        existing = await db.execute(
            select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
        )
        if existing.scalar_one_or_none():
            return "Ten produkt jest już na liście zakupów!"

        item = ShoppingListItem(product_id=product_id)
        db.add(item)
        await db.commit()
        product_result = await db.execute(
            select(ShoppingProduct).where(ShoppingProduct.id == product_id)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            return "Dodano produkt do listy zakupów."
        return f"Dodano '{product.name}' do listy zakupów!"

    return "Nie udało się dopasować produktu. Spróbuj jeszcze raz."


async def handle_create_new_product(
    text: str, discord_id: str, db: AsyncSession
) -> str:
    print(Fore.RED + "message" + str(text) + Style.RESET_ALL)

    prompt = get_new_product_prompt(text)
    response = await client.aio.models.generate_content(model=model, contents=prompt)
    print(Fore.GREEN + "AI response:" + str(response.text) + Style.RESET_ALL)

    clean = re.sub(r"```(?:json)?\n?", "", response.text or "").strip()
    data = json.loads(clean)
    new_product_name = (data.get("name") or "").strip()

    if data.get("status") == "cancelled":
        clear_conversation_status(discord_id)
        return "Ok, anulowano."

    if data.get("status") == "invalid":
        state = get_conversation_status(discord_id) or {}
        attempts = int(state.get("attempts", 0)) + 1

        if attempts >= 3:
            clear_conversation_status(discord_id)
            return "Nowy produkt nie został dodany do listy."

        set_conversation_status(
            discord_id, {"state": "awaiting_new_product", "attempts": attempts}
        )
        return (
            "To nie jest produkt, który można kupić w sklepie. "
            "Podaj samą nazwę produktu."
        )

    if data.get("status") == "valid":
        if not new_product_name:
            return "Nie udało się odczytać nazwy produktu. Spróbuj jeszcze raz."

        new_product = ShoppingProduct(name=new_product_name)
        db.add(new_product)
        await db.commit()
        await db.refresh(new_product)

        item = ShoppingListItem(product_id=new_product.id)
        db.add(item)
        await db.commit()

        clear_conversation_status(discord_id)
        return f"Dodałem '{new_product_name}' do bazy i do listy zakupów!"

    return "Nie udało się rozpoznać odpowiedzi. Spróbuj jeszcze raz."


async def handle_awaiting_confirm(
    message: str, discord_id: str, product_id: int, db: AsyncSession
) -> str:
    prompt = get_confirm_product_match_prompt(message)
    response = await client.aio.models.generate_content(model=model, contents=prompt)
    print(Fore.GREEN + "AI response:" + str(response.text) + Style.RESET_ALL)

    clean = re.sub(r"```(?:json)?\n?", "", response.text or "").strip()
    data = json.loads(clean)
    decision = data.get("decision")

    if decision == "confirm":
        existing = await db.execute(
            select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
        )
        if existing.scalar_one_or_none():
            return "Ten produkt jest już na liście zakupów!"

        item = ShoppingListItem(product_id=product_id)
        db.add(item)
        await db.commit()
        clear_conversation_status(discord_id)

        product_result = await db.execute(
            select(ShoppingProduct).where(ShoppingProduct.id == product_id)
        )
        product = product_result.scalar_one_or_none()
        if not product:
            return "Dodano produkt do listy zakupów."
        return f"Dodano '{product.name}' do listy zakupów!"

    if decision == "new_product":
        clear_conversation_status(discord_id)
        new_message = (data.get("product_text") or message).strip()
        return await handle_add_to_shopping_list(new_message, discord_id, db)

    clear_conversation_status(discord_id)
    return "Ok, nie dodałam tego produktu."


async def handle_clear_shopping_list(db: AsyncSession) -> str:
    await db.execute(delete(ShoppingListItem))
    await db.commit()
    return "Lista zakupów została wyczyszczona!"


async def handle_get_shopping_list(db: AsyncSession) -> str:
    result = await db.execute(
        select(ShoppingListItem).options(joinedload(ShoppingListItem.product))
    )
    items = result.scalars().all()
    if not items:
        return "Lista zakupów jest pusta!"
    product_names = [str(item.product.name) for item in items if item.product]
    return "Lista zakupów:\n" + "\n".join([f"- {name}" for name in product_names])


async def handle_delete_from_shopping_list(text: str, db: AsyncSession) -> str:
    product_list_raw = await db.execute(select(ShoppingProduct))
    products = product_list_raw.scalars().all()
    product_list_text = "\n".join([f"- id:{p.id} {p.name}" for p in products])

    prompt = get_delete_product_prompt(product_list_text, text)
    response = await client.aio.models.generate_content(model=model, contents=prompt)
    print(Fore.GREEN + "AI response:" + str(response.text) + Style.RESET_ALL)

    clean = re.sub(r"```(?:json)?\n?", "", response.text or "").strip()
    data = json.loads(clean)

    product_id = data.get("product_id")
    if product_id is None:
        return "Taki produkt nie istnieje"

    existing = await db.execute(
        select(ShoppingListItem).where(ShoppingListItem.product_id == product_id)
    )
    product = existing.scalar_one_or_none()

    if product:
        product_result = await db.execute(
            select(ShoppingProduct).where(ShoppingProduct.id == product_id)
        )
        product_entity = product_result.scalar_one_or_none()

        await db.execute(delete(ShoppingListItem).where(ShoppingListItem.product_id == product_id))
        await db.commit()

        if product_entity:
            return f"Produkt '{product_entity.name}' został usunięty z listy zakupów!"
        return "Produkt został usunięty z listy zakupów!"

    return "Nie ma tego produktu na liście zakupów!"
