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
  shoppingListItem: { findFirst: vi.fn(), create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
};

const mockFeederService = { handleFeedCat: vi.fn(), handleTurnOnLight: vi.fn(), handleTurnOffLight: vi.fn(), handleStopFeed: vi.fn(), handleResetFeeder: vi.fn(), handleTakeSnapshot: vi.fn() };
const mockConfig = { get: vi.fn().mockReturnValue("gemini-2.0-flash") };

const actions = [{ name: "add_to_shopping_list", description: "..." }, { name: "none", description: "..." }];
const DISCORD_ID = "user_flow";

describe("Conversation Flow", () => {
  let service: AiService;
  let conversationService: ConversationService;

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
    conversationService = module.get(ConversationService);
  });

  // ── Flow: produkt nie znaleziony → user podaje nowy ──────────────────────────

  describe("awaiting_new_product flow", () => {
    it("turn 1: produkt nie znaleziony → pyta o nowy", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue([]);
      mockGenerateContent
        .mockResolvedValueOnce({ text: JSON.stringify({ action: "add_to_shopping_list" }) })
        .mockResolvedValueOnce({ text: JSON.stringify({ status: "not_found", product_id: null }) });

      const result = await service.getActionType("indyk", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW);
      expect(conversationService.get(DISCORD_ID)?.["state"]).toBe("awaiting_new_product");
    });

    it("turn 2: user podaje nazwę → produkt dodany", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_new_product", attempts: 0 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "valid", name: "indyk" }) });
      mockPrisma.shoppingProduct.create.mockResolvedValue({ id: 99, name: "indyk" });
      mockPrisma.shoppingListItem.create.mockResolvedValue({});

      const result = await service.getActionType("indyk", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.NEW_PRODUCT_ADDED("indyk"));
      expect(mockPrisma.shoppingProduct.create).toHaveBeenCalled();
      expect(conversationService.get(DISCORD_ID)).toBeNull();
    });

    it("turn 2: user rezygnuje → anulowano", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_new_product", attempts: 0 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "cancelled" }) });

      const result = await service.getActionType("nieważne", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.CANCELLED);
      expect(mockPrisma.shoppingProduct.create).not.toHaveBeenCalled();
    });

    it("turn 2: bzdura 3x → poddaje się", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_new_product", attempts: 2 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ status: "invalid" }) });

      const result = await service.getActionType("qwerty!!!", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.NEW_PRODUCT_NOT_ADDED);
      expect(conversationService.get(DISCORD_ID)).toBeNull();
    });
  });

  // ── Flow: AI niepewne → potwierdzenie ────────────────────────────────────────

  describe("awaiting_confirm flow", () => {
    it("turn 1: AI niepewne → pyta o potwierdzenie", async () => {
      mockPrisma.shoppingProduct.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);
      mockGenerateContent
        .mockResolvedValueOnce({ text: JSON.stringify({ action: "add_to_shopping_list" }) })
        .mockResolvedValueOnce({ text: JSON.stringify({ status: "confirm", product_id: 1 }) });

      const result = await service.getActionType("mleczko", DISCORD_ID);
      expect(result.reply).toContain("tak/nie");
      expect(conversationService.get(DISCORD_ID)?.["state"]).toBe("awaiting_confirm");
    });

    it("turn 2: user potwierdza → produkt dodany", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ decision: "confirm" }) });
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
      mockPrisma.shoppingListItem.create.mockResolvedValue({});
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

      const result = await service.getActionType("tak", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.PRODUCT_ADDED("mleko"));
      expect(conversationService.get(DISCORD_ID)).toBeNull();
    });

    it("turn 2: user odmawia → nic nie dodano", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ decision: "decline" }) });

      const result = await service.getActionType("nie", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.DECLINED);
      expect(mockPrisma.shoppingListItem.create).not.toHaveBeenCalled();
    });

    it("turn 2: user podaje inny produkt → szuka od nowa", async () => {
      conversationService.set(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });
      mockGenerateContent
        .mockResolvedValueOnce({ text: JSON.stringify({ decision: "new_product", product_text: "indyk" }) })
        .mockResolvedValueOnce({ text: JSON.stringify({ status: "not_found", product_id: null }) });
      mockPrisma.shoppingProduct.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);

      const result = await service.getActionType("tak ale indyk", DISCORD_ID);
      expect(result.reply).toBe(MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW);
    });
  });
});
