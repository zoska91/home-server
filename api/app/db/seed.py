import asyncio
from sqlalchemy import text
from app.db.database import AsyncSessionLocal
from app.db.models import Action

async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(text("SELECT COUNT(*) FROM actions"))
        count = result.scalar()
        
        if count > 0:
            print("Actions already seeded, skipping...")
            return

        actions = [
            Action(name="add_to_shopping_list", description="User mentioned a product name or ingredient they need to buy. This action should be selected even if the user didn't explicitly say 'add' or 'buy' - just mentioning a product name like 'bread' or 'milk' is enough to trigger this action."),
            Action(name="clear_shopping_list", description="User wants to clear or reset the shopping list"),
            Action(name="get_shopping_list", description="User wants to retrieve the current shopping list"),
        ]

        db.add_all(actions)
        await db.commit()
        print("Seeded actions successfully!")

if __name__ == "__main__":
    asyncio.run(seed())