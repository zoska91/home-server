import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ConversationService } from "../conversation/conversation.service";
import {
  getProductMatchPrompt,
  getConfirmProductMatchPrompt,
  getNewProductPrompt,
  getDeleteProductPrompt,
} from "../prompts/shopping.prompt";
import { MESSAGES } from "../utils/messages";

type GenerateText = (contents: string) => Promise<string>;

@Injectable()
export class ShoppingAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  private parseJson(text: string) {
    return JSON.parse(text.replace(/```(?:json)?\n?/g, "").trim());
  }

  async handleConversationState(
    text: string,
    discordId: string,
    generate: GenerateText,
  ): Promise<string | null> {
    const state = this.conversationService.get(discordId);
    if (!state) return null;

    if (state["state"] === "awaiting_confirm") {
      return this.handleAwaitingConfirm(
        text,
        discordId,
        state["product_id"] as number,
        generate,
      );
    }
    if (state["state"] === "awaiting_new_product") {
      return this.handleCreateNewProduct(text, discordId, generate);
    }
    return null;
  }

  async handleAction(
    action: string,
    text: string,
    discordId: string,
    generate: GenerateText,
  ): Promise<string | null> {
    switch (action) {
      case "add_to_shopping_list":
        return this.handleAddToShoppingList(text, discordId, generate);
      case "delete_from_shopping_list":
        return this.handleDeleteFromShoppingList(text, generate);
      case "clear_shopping_list":
        return this.handleClearShoppingList();
      case "get_shopping_list":
        return this.handleGetShoppingList();
      case "create_new_product":
        return this.handleCreateNewProduct(text, discordId, generate);
      default:
        return null;
    }
  }

  async handleAddToShoppingList(
    message: string,
    discordId: string,
    generate: GenerateText,
  ): Promise<string> {
    const products = await this.prisma.shoppingProduct.findMany();
    const productListText = products
      .map((p) => `- id:${p.id} ${p.name}`)
      .join("\n");

    const raw = await generate(getProductMatchPrompt(productListText, message));
    console.log("[add_to_shopping] AI:", raw);
    const data = this.parseJson(raw);

    if (data.status === "confirm") {
      this.conversationService.set(discordId, {
        state: "awaiting_confirm",
        product_id: data.product_id,
      });
      return MESSAGES.PRODUCT_CONFIRM(message);
    }
    if (data.status === "not_found") {
      this.conversationService.set(discordId, {
        state: "awaiting_new_product",
        attempts: 0,
      });
      return MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW;
    }
    if (data.status === "found") {
      const productId: number = data.product_id;
      if (!productId) return MESSAGES.PRODUCT_MATCH_FAILED;
      const existing = await this.prisma.shoppingListItem.findFirst({
        where: { productId },
      });
      if (existing) return MESSAGES.PRODUCT_ALREADY_ON_LIST;
      await this.prisma.shoppingListItem.create({ data: { productId } });
      const product = await this.prisma.shoppingProduct.findUnique({
        where: { id: productId },
      });
      return product
        ? MESSAGES.PRODUCT_ADDED(product.name)
        : MESSAGES.PRODUCT_ADDED_GENERIC;
    }
    return MESSAGES.PRODUCT_MATCH_FAILED;
  }

  async handleCreateNewProduct(
    text: string,
    discordId: string,
    generate: GenerateText,
  ): Promise<string> {
    console.log("[create_new_product] message:", text);
    const raw = await generate(getNewProductPrompt(text));
    console.log("[create_new_product] AI:", raw);
    const data = this.parseJson(raw);

    if (data.status === "cancelled") {
      this.conversationService.clear(discordId);
      return MESSAGES.CANCELLED;
    }
    if (data.status === "invalid") {
      const state = this.conversationService.get(discordId) ?? {};
      const attempts = (Number(state["attempts"]) || 0) + 1;
      if (attempts >= 3) {
        this.conversationService.clear(discordId);
        return MESSAGES.NEW_PRODUCT_NOT_ADDED;
      }
      this.conversationService.set(discordId, {
        state: "awaiting_new_product",
        attempts,
      });
      return MESSAGES.INVALID_PRODUCT;
    }
    if (data.status === "valid") {
      const name = (data.name as string)?.trim();
      if (!name) return MESSAGES.PRODUCT_NAME_READ_ERROR;
      const newProduct = await this.prisma.shoppingProduct.create({
        data: { name },
      });
      await this.prisma.shoppingListItem.create({
        data: { productId: newProduct.id },
      });
      this.conversationService.clear(discordId);
      return MESSAGES.NEW_PRODUCT_ADDED(name);
    }
    return MESSAGES.RESPONSE_PARSE_ERROR;
  }

  async handleAwaitingConfirm(
    message: string,
    discordId: string,
    productId: number,
    generate: GenerateText,
  ): Promise<string> {
    const raw = await generate(getConfirmProductMatchPrompt(message));
    console.log("[awaiting_confirm] AI:", raw);
    const data = this.parseJson(raw);

    if (data.decision === "confirm") {
      const existing = await this.prisma.shoppingListItem.findFirst({
        where: { productId },
      });
      if (existing) return MESSAGES.PRODUCT_ALREADY_ON_LIST;
      await this.prisma.shoppingListItem.create({ data: { productId } });
      this.conversationService.clear(discordId);
      const product = await this.prisma.shoppingProduct.findUnique({
        where: { id: productId },
      });
      return product
        ? MESSAGES.PRODUCT_ADDED(product.name)
        : MESSAGES.PRODUCT_ADDED_GENERIC;
    }
    if (data.decision === "new_product") {
      this.conversationService.clear(discordId);
      return this.handleAddToShoppingList(
        ((data.product_text as string) || message).trim(),
        discordId,
        generate,
      );
    }
    this.conversationService.clear(discordId);
    return MESSAGES.DECLINED;
  }

  async handleClearShoppingList(): Promise<string> {
    await this.prisma.shoppingListItem.deleteMany();
    return MESSAGES.LIST_CLEARED;
  }

  async handleGetShoppingList(): Promise<string> {
    const items = await this.prisma.shoppingListItem.findMany({
      include: { product: true },
    });
    if (!items.length) return MESSAGES.LIST_EMPTY;
    return (
      MESSAGES.LIST_HEADER + items.map((i) => `- ${i.product.name}`).join("\n")
    );
  }

  async handleDeleteFromShoppingList(
    text: string,
    generate: GenerateText,
  ): Promise<string> {
    const products = await this.prisma.shoppingProduct.findMany();
    const productListText = products
      .map((p) => `- id:${p.id} ${p.name}`)
      .join("\n");
    const raw = await generate(getDeleteProductPrompt(productListText, text));
    console.log("[delete_from_shopping] AI:", raw);
    const data = this.parseJson(raw);

    const productId: number | null = data.product_id ?? null;
    if (!productId) return MESSAGES.PRODUCT_NOT_EXISTS;
    const item = await this.prisma.shoppingListItem.findFirst({
      where: { productId },
    });
    if (!item) return MESSAGES.PRODUCT_NOT_ON_LIST;
    const product = await this.prisma.shoppingProduct.findUnique({
      where: { id: productId },
    });
    await this.prisma.shoppingListItem.deleteMany({ where: { productId } });
    return product
      ? MESSAGES.PRODUCT_DELETED(product.name)
      : MESSAGES.PRODUCT_DELETED_GENERIC;
  }
}
