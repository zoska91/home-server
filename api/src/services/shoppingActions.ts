import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db/prisma";
import {
  getProductMatchPrompt,
  getConfirmProductMatchPrompt,
  getNewProductPrompt,
  getDeleteProductPrompt,
} from "../prompts/shoppingPrompt";
import {
  setConversationStatus,
  getConversationStatus,
  clearConversationStatus,
} from "../utils/conversationState";
import { MESSAGES } from "../messages";

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });
const model = process.env["BASIC_AI_MODEL"] ?? "gemini-2.0-flash";

function parseJson(text: string) {
  return JSON.parse(text.replace(/```(?:json)?\n?/g, "").trim());
}

export async function handleAddToShoppingList(message: string, discordId: string): Promise<string> {
  const products = await prisma.shoppingProduct.findMany();
  const productListText = products.map((p) => `- id:${p.id} ${p.name}`).join("\n");

  const response = await ai.models.generateContent({ model, contents: getProductMatchPrompt(productListText, message) });
  console.log("[add_to_shopping] AI:", response.text);

  const data = parseJson(response.text ?? "{}");

  if (data.status === "confirm") {
    setConversationStatus(discordId, { state: "awaiting_confirm", product_id: data.product_id });
    return MESSAGES.CONFIRM_PRODUCT_MATCH(message);
  }

  if (data.status === "not_found") {
    setConversationStatus(discordId, { state: "awaiting_new_product", attempts: 0 });
    return MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW;
  }

  if (data.status === "found") {
    const productId: number = data.product_id;
    if (!productId) return MESSAGES.PRODUCT_MATCH_FAILED;

    const existing = await prisma.shoppingListItem.findFirst({ where: { productId } });
    if (existing) return MESSAGES.PRODUCT_ALREADY_ON_LIST;

    await prisma.shoppingListItem.create({ data: { productId } });
    const product = await prisma.shoppingProduct.findUnique({ where: { id: productId } });
    return product ? MESSAGES.PRODUCT_ADDED(product.name) : MESSAGES.PRODUCT_ADDED_FALLBACK;
  }

  return MESSAGES.PRODUCT_MATCH_FAILED;
}

export async function handleCreateNewProduct(text: string, discordId: string): Promise<string> {
  console.log("[create_new_product] message:", text);

  const response = await ai.models.generateContent({ model, contents: getNewProductPrompt(text) });
  console.log("[create_new_product] AI:", response.text);

  const data = parseJson(response.text ?? "{}");

  if (data.status === "cancelled") {
    clearConversationStatus(discordId);
    return MESSAGES.CANCELLED;
  }

  if (data.status === "invalid") {
    const state = getConversationStatus(discordId) ?? {} as Record<string, unknown>;
    const attempts = (Number(state["attempts"]) || 0) + 1;

    if (attempts >= 3) {
      clearConversationStatus(discordId);
      return MESSAGES.NEW_PRODUCT_NOT_ADDED;
    }

    setConversationStatus(discordId, { state: "awaiting_new_product", attempts });
    return MESSAGES.PRODUCT_NOT_VALID;
  }

  if (data.status === "valid") {
    const name = (data.name as string)?.trim();
    if (!name) return MESSAGES.PRODUCT_NAME_READ_FAILED;

    const newProduct = await prisma.shoppingProduct.create({ data: { name } });
    await prisma.shoppingListItem.create({ data: { productId: newProduct.id } });
    clearConversationStatus(discordId);
    return MESSAGES.NEW_PRODUCT_ADDED(name);
  }

  return MESSAGES.PRODUCT_RESPONSE_UNRECOGNIZED;
}

export async function handleAwaitingConfirm(message: string, discordId: string, productId: number): Promise<string> {
  const response = await ai.models.generateContent({ model, contents: getConfirmProductMatchPrompt(message) });
  console.log("[awaiting_confirm] AI:", response.text);

  const data = parseJson(response.text ?? "{}");

  if (data.decision === "confirm") {
    const existing = await prisma.shoppingListItem.findFirst({ where: { productId } });
    if (existing) return MESSAGES.PRODUCT_ALREADY_ON_LIST;

    await prisma.shoppingListItem.create({ data: { productId } });
    clearConversationStatus(discordId);

    const product = await prisma.shoppingProduct.findUnique({ where: { id: productId } });
    return product ? MESSAGES.PRODUCT_ADDED(product.name) : MESSAGES.PRODUCT_ADDED_FALLBACK;
  }

  if (data.decision === "new_product") {
    clearConversationStatus(discordId);
    const newMessage = ((data.product_text as string) || message).trim();
    return handleAddToShoppingList(newMessage, discordId);
  }

  clearConversationStatus(discordId);
  return MESSAGES.DECLINED;
}

export async function handleClearShoppingList(): Promise<string> {
  await prisma.shoppingListItem.deleteMany();
  return MESSAGES.SHOPPING_LIST_CLEARED;
}

export async function handleGetShoppingList(): Promise<string> {
  const items = await prisma.shoppingListItem.findMany({ include: { product: true } });
  if (!items.length) return MESSAGES.SHOPPING_LIST_EMPTY;
  const names = items.map((i) => i.product.name);
  return MESSAGES.SHOPPING_LIST_HEADER + "\n" + names.map((n) => `- ${n}`).join("\n");
}

export async function handleDeleteFromShoppingList(text: string): Promise<string> {
  const products = await prisma.shoppingProduct.findMany();
  const productListText = products.map((p) => `- id:${p.id} ${p.name}`).join("\n");

  const response = await ai.models.generateContent({ model, contents: getDeleteProductPrompt(productListText, text) });
  console.log("[delete_from_shopping] AI:", response.text);

  const data = parseJson(response.text ?? "{}");
  const productId: number | null = data.product_id ?? null;
  if (!productId) return MESSAGES.PRODUCT_NOT_IN_DB;

  const item = await prisma.shoppingListItem.findFirst({ where: { productId } });
  if (!item) return MESSAGES.PRODUCT_NOT_ON_LIST;

  const product = await prisma.shoppingProduct.findUnique({ where: { id: productId } });
  await prisma.shoppingListItem.deleteMany({ where: { productId } });

  return product ? MESSAGES.PRODUCT_DELETED(product.name) : MESSAGES.PRODUCT_DELETED_FALLBACK;
}
