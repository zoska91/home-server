import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const actions = [
  { name: "add_to_shopping_list", description: "User mentioned a product name or ingredient they need to buy. This action should be selected even if the user didn't explicitly say 'add' or 'buy' - just mentioning a product name like 'bread' or 'milk' is enough to trigger this action." },
  { name: "delete_from_shopping_list", description: "User wants to delete a specific item from the shopping list" },
  { name: "clear_shopping_list", description: "User wants to clear or reset the shopping list" },
  { name: "get_shopping_list", description: "User wants to retrieve the current shopping list" },
  { name: "create_new_product", description: "User wants to create a new product in the database" },
  { name: "get_status_answer", description: "User wants to get the current status of the conversation. Might be also just question about status" },
  { name: "feed_cat", description: "User wants to feed the cat. This includes phrases like: 'nakarm kota', 'daj kotu jeść', 'kot jest głodny', 'rzuć karmę'. Focus on the intent of triggering the motor." },
  { name: "turn_on_feeder_light", description: "User wants to turn on the LED on the feeder. Examples: 'zapal światło kota', 'włącz lampkę'." },
  { name: "turn_off_feeder_light", description: "User wants to turn off the LED on the feeder. Examples: 'zgaś światło kota', 'wyłącz lampkę'." },
  { name: "stop_feed", description: "User wants to stop the feeder motor. Examples: 'zatrzymaj karmik', 'stop', 'wyłącz silnik'." },
  { name: "reset_feeder", description: "User wants to restart the feeder device. Examples: 'zresetuj karmik', 'restart karmika'." },
  { name: "take_snapshot", description: "User wants to see a photo from the feeder camera. Examples: 'pokaż zdjęcie', 'zrób fotkę', 'co robi kot'." },
];

const motorConfigs = [
  { name: "sm", durationMs: 9000, isDefault: false },
  { name: "md", durationMs: 13000, isDefault: true },
  { name: "lg", durationMs: 20000, isDefault: false },
];

const lightConfigs = [
  { name: "dm", durationSec: 15, isDefault: false },
  { name: "sm", durationSec: 60, isDefault: true },
  { name: "lg", durationSec: 120, isDefault: false },
  { name: "none", durationSec: 0, isDefault: false },
];

export async function seed() {
  for (const action of actions) {
    await prisma.action.upsert({ where: { name: action.name }, update: { description: action.description }, create: action });
  }
  for (const cfg of motorConfigs) {
    await prisma.feederMotorConfig.upsert({ where: { name: cfg.name }, update: {}, create: cfg });
  }
  for (const cfg of lightConfigs) {
    await prisma.feederLightConfig.upsert({ where: { name: cfg.name }, update: {}, create: cfg });
  }
  console.log("[seed] Done!");
}
