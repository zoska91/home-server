from sqlalchemy import text
from app.db.database import AsyncSessionLocal
from app.db.models import Action


async def seed():
    async with AsyncSessionLocal() as db:

        actions = [
            Action(
                name="add_to_shopping_list",
                description="User mentioned a product name or ingredient they need to buy. This action should be selected even if the user didn't explicitly say 'add' or 'buy' - just mentioning a product name like 'bread' or 'milk' is enough to trigger this action.",
            ),
            Action(
                name="clear_shopping_list",
                description="User wants to clear or reset the shopping list",
            ),
            Action(
                name="get_shopping_list",
                description="User wants to retrieve the current shopping list",
            ),
            Action(
                name="create_new_product",
                description="User wants to create a new product in the database",
            ),
            Action(
                name="get_status_answer",
                description="User wants to get the current status of the conversation. Might be also just question about status",
            ),
        ]

    for action in actions:
        result = await db.execute(
            text("SELECT COUNT(*) FROM actions WHERE name = :name"),
            {"name": action.name},
        )
        if result.scalar() == 0:
            db.add(action)
            print(f"Added action: {action.name}")
        else:
            print(f"Action already exists: {action.name}")

    await db.commit()
    print("Seed complete!")
