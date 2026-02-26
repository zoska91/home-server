import json
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import joinedload
from app.db.models import ShoppingProduct, ShoppingListItem
from app.prompts.get_product_match_prompt import get_product_match_prompt
from google import genai
import os
from colorama import Fore, Style

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
model = os.getenv("BASIC_AI_MODEL")

async def handle_add_to_shopping_list(text: str, db: AsyncSession) -> str:
    result = await db.execute(select(ShoppingProduct))
    products = result.scalars().all()
    product_list = "\n".join([f"- id:{p.id} {p.name}" for p in products])

    prompt = get_product_match_prompt(product_list, text)
    response = await client.aio.models.generate_content(
        model=model,
        contents=prompt
    )

    clean = re.sub(r"```(?:json)?\n?", "", response.text).strip()
    data = json.loads(clean)
    print(Fore.YELLOW + "AI data:" + str(data) + Style.RESET_ALL)

    if not data["confident"]:
        return data["reply"]

    if data["product_id"] is None:
        new_product = ShoppingProduct(name=text)
        db.add(new_product)
        await db.commit()
        await db.refresh(new_product)
        item = ShoppingListItem(product_id=new_product.id)
        db.add(item)
        await db.commit()
        return f"Nie znałam tego produktu, dodałam '{text}' do bazy i do listy zakupów!"


    existing = await db.execute(
        select(ShoppingListItem).where(ShoppingListItem.product_id == data["product_id"])
    )
    if existing.scalar_one_or_none():
        return f"Ten produkt jest już na liście zakupów!"

    item = ShoppingListItem(product_id=data["product_id"])
    db.add(item)
    await db.commit()
    return data["reply"]

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
    product_names = [item.product.name for item in items]
    return "Lista zakupów:\n" + "\n".join([f"- {name}" for name in product_names])

async def get_ai_reply(text: str) -> str:
    response = await client.aio.models.generate_content(
        model=model,
        contents=text
    )
    return response.text.strip()