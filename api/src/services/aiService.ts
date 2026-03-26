import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db/prisma";
import { getActionTypePrompt } from "../prompts/actionsPrompt";
import { getConversationStatus } from "../utils/conversationState";
import { handleGetStatusAnswer, getAiReply } from "./commonActions";
import {
  handleAddToShoppingList,
  handleDeleteFromShoppingList,
  handleClearShoppingList,
  handleGetShoppingList,
  handleCreateNewProduct,
  handleAwaitingConfirm,
} from "./shoppingActions";
import {
  handleFeedCat,
  handleTurnOnFeederLight,
  handleTurnOffFeederLight,
  handleStopFeed,
  handleResetFeeder,
  handleTakeSnapshot,
} from "./feederActions";

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });
const model = process.env["BASIC_AI_MODEL"] ?? "gemini-2.0-flash";

function parseJson(text: string) {
  return JSON.parse(text.replace(/```(?:json)?\n?/g, "").trim());
}

async function handleAction(action: string, text: string, discordId: string): Promise<string> {
  switch (action) {
    case "add_to_shopping_list":       return handleAddToShoppingList(text, discordId);
    case "delete_from_shopping_list":  return handleDeleteFromShoppingList(text);
    case "clear_shopping_list":        return handleClearShoppingList();
    case "get_shopping_list":          return handleGetShoppingList();
    case "create_new_product":         return handleCreateNewProduct(text, discordId);
    case "get_status_answer":          return handleGetStatusAnswer(discordId);
    case "feed_cat":                   return handleFeedCat(text);
    case "turn_on_feeder_light":       return handleTurnOnFeederLight(text);
    case "turn_off_feeder_light":      return handleTurnOffFeederLight();
    case "stop_feed":                  return handleStopFeed();
    case "reset_feeder":               return handleResetFeeder();
    case "take_snapshot":              return handleTakeSnapshot();
    default:                           return getAiReply(text);
  }
}

async function handleConversationState(message: string, discordId: string): Promise<string | null> {
  const state = getConversationStatus(discordId);
  if (!state) return null;

  console.log(`[state] ${discordId}: ${JSON.stringify(state)}`);

  if (state["state"] === "awaiting_confirm") {
    return handleAwaitingConfirm(message, discordId, state["product_id"] as number);
  }
  if (state["state"] === "awaiting_new_product") {
    return handleCreateNewProduct(message, discordId);
  }
  return null;
}

export async function getActionType(message: string, discordId: string): Promise<{ reply: string }> {
  const stateReply = await handleConversationState(message, discordId);
  if (stateReply) return { reply: stateReply };

  const actions = await prisma.action.findMany();
  const actionList = actions.map((a) => `- ${a.name}: ${a.description}`).join("\n");

  const response = await ai.models.generateContent({
    model,
    contents: getActionTypePrompt(actionList, message),
  });

  const text = response.text ?? "";
  console.log("[ai_action] raw:", text);

  const data = parseJson(text);
  const action: string = data.action ?? "none";
  console.log("[ai_action]", action);

  const reply = await handleAction(action, message, discordId);
  return { reply };
}
