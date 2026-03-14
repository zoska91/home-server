from sqlalchemy import text
from app.db.database import AsyncSessionLocal
from app.db.models import Action, FeederMotorConfig, FeederLightConfig


async def seed():
    async with AsyncSessionLocal() as db:
        actions = [
            Action(
                name="add_to_shopping_list",
                description="User mentioned a product name or ingredient they need to buy. This action should be selected even if the user didn't explicitly say 'add' or 'buy' - just mentioning a product name like 'bread' or 'milk' is enough to trigger this action.",
            ),
            Action(
                name="delete_from_shopping_list",
                description="User wants to delete a specific item from the shopping list",
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
            Action(
                name="feed_cat",
                description="User wants to feed the cat. This includes phrases like: 'nakarm kota', 'daj kotu jeść', 'kot jest głodny', 'rzuć karmę'. Focus on the intent of triggering the motor.",
            ),
            Action(
                name="turn_on_feeder_light",
                description="User wants to turn on the LED on the feeder. Examples: 'zapal światło kota', 'włącz lampkę'. Focus on the intent of increasing visibility.",
            ),
            Action(
                name="turn_off_feeder_light",
                description="User wants to turn off the LED on the feeder. Examples: 'zgaś światło kota', 'wyłącz lampkę'.",
            ),
            Action(
                name="stop_feed",
                description="User wants to stop the feeder motor that is currently running. Examples: 'zatrzymaj karmik', 'stop', 'wyłącz silnik'.",
            ),
            Action(
                name="reset_feeder",
                description="User wants to restart or reset the feeder device. Examples: 'zresetuj karmik', 'restart karmika', 'uruchom ponownie'.",
            ),
            Action(
                name="take_snapshot",
                description="User wants to see a photo from the feeder camera. Examples: 'pokaż zdjęcie', 'zrób fotkę', 'jak wygląda', 'co robi kot'.",
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

        motor_configs = [
            FeederMotorConfig(name="sm", duration_ms=8000, is_default=False),
            FeederMotorConfig(name="md", duration_ms=9000, is_default=True),
            FeederMotorConfig(name="lg", duration_ms=12000, is_default=False),
        ]

        for cfg in motor_configs:
            result = await db.execute(
                text("SELECT COUNT(*) FROM feeder_motor_configs WHERE name = :name"),
                {"name": cfg.name},
            )
            if result.scalar() == 0:
                db.add(cfg)
                print(f"Added motor config: {cfg.name}")

        light_configs = [
            FeederLightConfig(name="dm", duration_sec=30, is_default=False),
            FeederLightConfig(name="sm", duration_sec=60, is_default=True),
            FeederLightConfig(name="lg", duration_sec=120, is_default=False),
            FeederLightConfig(name="none", duration_sec=0, is_default=False),
        ]

        for cfg in light_configs:
            result = await db.execute(
                text("SELECT COUNT(*) FROM feeder_light_configs WHERE name = :name"),
                {"name": cfg.name},
            )
            if result.scalar() == 0:
                db.add(cfg)
                print(f"Added light config: {cfg.name}")

        await db.commit()
        print("Seed complete!")
