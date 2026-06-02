import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ConfigService } from "@nestjs/config";
import { AiService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { FeederService } from "../feeder/feeder.service";
import { ConversationService } from "../conversation/conversation.service";
import { MESSAGES } from "../utils/messages";
import { ShoppingAiService } from "../shopping/shopping-ai.service";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("ollama", () => ({
  Ollama: vi.fn().mockImplementation(() => ({
    generate: async (...args: unknown[]) => {
      const result = await mockGenerateContent(...args);
      return { response: result.response ?? result.text ?? result };
    },
  })),
}));

const mockPrisma = {
  action: { findMany: vi.fn() },
  shoppingProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  shoppingListItem: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
};

const mockFeederService = {
  handleFeedCat: vi.fn(),
  handleTurnOnLight: vi.fn(),
  handleTurnOffLight: vi.fn(),
  handleStopFeed: vi.fn(),
  handleResetFeeder: vi.fn(),
  handleTakeSnapshot: vi.fn().mockReturnValue("http://192.168.1.100/snapshot"),
};

const mockConfig = { get: vi.fn().mockReturnValue("gemini-2.0-flash") };

const actions = [
  { name: "add_to_shopping_list", description: "..." },
  { name: "get_shopping_list", description: "..." },
  { name: "feed_cat", description: "..." },
  { name: "take_snapshot", description: "..." },
  { name: "none", description: "..." },
];

describe("AiService", () => {
  let service: AiService;
  let shoppingAiService: ShoppingAiService;
  let conversationService: ConversationService;
  const generateText = async (contents: string) => {
    const result = await mockGenerateContent(contents);
    return result.response ?? result.text ?? result;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.action.findMany.mockResolvedValue(actions);

    const module = await Test.createTestingModule({
      providers: [
        AiService,
        ShoppingAiService,
        ConversationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FeederService, useValue: mockFeederService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(AiService);
    shoppingAiService = module.get(ShoppingAiService);
    conversationService = module.get(ConversationService);
  });

  describe("getActionType", () => {
    it("returns shopping list", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ action: "get_shopping_list" }) });
      mockPrisma.shoppingListItem.findMany.mockResolvedValue([{ product: { name: "mleko" } }]);

      const result = await service.getActionType("co mam?", "user1");
      expect(result.reply).toContain("mleko");
    });

    it("delegates feed_cat to FeederService", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ action: "feed_cat" }) });
      mockFeederService.handleFeedCat.mockResolvedValue("Nakarmiono kota!");

      const result = await service.getActionType("nakarm kota", "user1");
      expect(mockFeederService.handleFeedCat).toHaveBeenCalledWith("nakarm kota");
      expect(result.reply).toBe("Nakarmiono kota!");
    });

    it("returns snapshot URL for take_snapshot", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ action: "take_snapshot" }) });
      const result = await service.getActionType("pokaż zdjęcie", "user1");
      expect(result.reply).toBe("http://192.168.1.100/snapshot");
    });

    it("handles awaiting_confirm state — skips action detection", async () => {
      conversationService.set("user1", { state: "awaiting_confirm", product_id: 1 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ decision: "decline" }) });

      const result = await service.getActionType("nie", "user1");
      expect(result.reply).toBe(MESSAGES.DECLINED);
      expect(mockPrisma.action.findMany).not.toHaveBeenCalled();
    });

    it("handles awaiting_new_product state", async () => {
      conversationService.set("user1", { state: "awaiting_new_product", attempts: 0 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "cancelled" }) });

      const result = await service.getActionType("nieważne", "user1");
      expect(result.reply).toBe(MESSAGES.CANCELLED);
    });

    it("returns AI reply for 'none' action", async () => {
      mockGenerateContent
        .mockResolvedValueOnce({ text: JSON.stringify({ action: "none" }) })
        .mockResolvedValueOnce({ text: "Nie rozumiem." });

      const result = await service.getActionType("bla bla", "user1");
      expect(result.reply).toBe("Nie rozumiem.");
    });
  });

  describe("handleAddToShoppingList", () => {
    const products = [{ id: 1, name: "mleko" }];

    it("adds product on exact match", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "found", product_id: 1 }) });
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
      mockPrisma.shoppingListItem.create.mockResolvedValue({});
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

      const result = await shoppingAiService.handleAddToShoppingList(
        "mleko",
        "user1",
        generateText,
      );
      expect(result).toBe(MESSAGES.PRODUCT_ADDED("mleko"));
    });

    it("returns already-on-list message", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "found", product_id: 1 }) });
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue({ id: 1, productId: 1 });

      expect(
        await shoppingAiService.handleAddToShoppingList(
          "mleko",
          "user1",
          generateText,
        ),
      ).toBe(MESSAGES.PRODUCT_ALREADY_ON_LIST);
    });

    it("sets awaiting_confirm state", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "confirm", product_id: 1 }) });

      await shoppingAiService.handleAddToShoppingList(
        "mleczko",
        "user1",
        generateText,
      );
      expect(conversationService.get("user1")?.["state"]).toBe("awaiting_confirm");
    });

    it("sets awaiting_new_product state when not found", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "not_found", product_id: null }) });

      await shoppingAiService.handleAddToShoppingList(
        "indyk",
        "user1",
        generateText,
      );
      expect(conversationService.get("user1")?.["state"]).toBe("awaiting_new_product");
    });
  });

  describe("handleCreateNewProduct", () => {
    it("creates product on valid input", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "valid", name: "indyk" }) });
      mockPrisma.shoppingProduct.create.mockResolvedValue({ id: 99, name: "indyk" });
      mockPrisma.shoppingListItem.create.mockResolvedValue({});

      const result = await shoppingAiService.handleCreateNewProduct(
        "indyk",
        "user1",
        generateText,
      );
      expect(result).toBe(MESSAGES.NEW_PRODUCT_ADDED("indyk"));
      expect(conversationService.get("user1")).toBeNull();
    });

    it("cancels on user resignation", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "cancelled" }) });
      expect(
        await shoppingAiService.handleCreateNewProduct(
          "nieważne",
          "user1",
          generateText,
        ),
      ).toBe(MESSAGES.CANCELLED);
    });

    it("gives up after 3 invalid attempts", async () => {
      conversationService.set("user1", { state: "awaiting_new_product", attempts: 2 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "invalid" }) });

      const result = await shoppingAiService.handleCreateNewProduct(
        "qwerty",
        "user1",
        generateText,
      );
      expect(result).toBe(MESSAGES.NEW_PRODUCT_NOT_ADDED);
      expect(conversationService.get("user1")).toBeNull();
    });
  });

  describe("handleAwaitingConfirm", () => {
    it("adds product on confirm", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ decision: "confirm" }) });
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
      mockPrisma.shoppingListItem.create.mockResolvedValue({});
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

      const result = await shoppingAiService.handleAwaitingConfirm(
        "tak",
        "user1",
        1,
        generateText,
      );
      expect(result).toBe(MESSAGES.PRODUCT_ADDED("mleko"));
      expect(conversationService.get("user1")).toBeNull();
    });

    it("clears state on decline", async () => {
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ decision: "decline" }) });
      const result = await shoppingAiService.handleAwaitingConfirm(
        "nie",
        "user1",
        1,
        generateText,
      );
      expect(result).toBe(MESSAGES.DECLINED);
      expect(conversationService.get("user1")).toBeNull();
    });
  });
});
