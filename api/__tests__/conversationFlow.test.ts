import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearConversationStatus } from "../src/utils/conversationState";
import { MESSAGES } from "../src/messages";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("../src/db/prisma", () => ({
  prisma: {
    action: { findMany: vi.fn() },
    shoppingProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    shoppingListItem: { findFirst: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    feederMotorConfig: { findMany: vi.fn(), findFirst: vi.fn() },
    feederLightConfig: { findMany: vi.fn() },
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

vi.mock("../src/clients/feeder", () => ({
  sendFeedCommand: vi.fn(),
  sendFeedStopCommand: vi.fn(),
  sendLightOnCommand: vi.fn(),
  sendLightOffCommand: vi.fn(),
  sendResetCommand: vi.fn(),
  getSnapshotUrl: vi.fn().mockReturnValue("http://192.168.1.100/snapshot"),
}));

import { prisma } from "../src/db/prisma";
import { getActionType } from "../src/services/aiService";

const db = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const DISCORD_ID = "user_flow_test";

const actions = [
  { name: "add_to_shopping_list", description: "..." },
  { name: "get_shopping_list", description: "..." },
  { name: "none", description: "..." },
];

beforeEach(() => {
  vi.clearAllMocks();
  clearConversationStatus(DISCORD_ID);
  db["action"]!.findMany.mockResolvedValue(actions);
});

// ── Flow: produkt nie znaleziony → user podaje nowy → dodany ─────────────────

describe("Flow: awaiting_new_product", () => {
  it("turn 1: not found → pyta o nowy produkt", async () => {
    db["shoppingProduct"]!.findMany.mockResolvedValue([]);
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ action: "add_to_shopping_list" }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ status: "not_found", product_id: null }) });

    const result = await getActionType("indyk", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW);
  });

  it("turn 2: user podaje nazwę → produkt dodany do bazy i listy", async () => {
    // stan jest już ustawiony z poprzedniej tury
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_new_product", attempts: 0 });

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ status: "valid", name: "indyk" }),
    });
    db["shoppingProduct"]!.create.mockResolvedValue({ id: 99, name: "indyk" });
    db["shoppingListItem"]!.create.mockResolvedValue({});

    const result = await getActionType("indyk", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.NEW_PRODUCT_ADDED("indyk"));
    expect(db["shoppingProduct"]!.create).toHaveBeenCalledWith({ data: { name: "indyk" } });
  });

  it("turn 2: user rezygnuje → operacja anulowana", async () => {
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_new_product", attempts: 0 });

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ status: "cancelled" }),
    });

    const result = await getActionType("nieważne", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.CANCELLED);
    expect(db["shoppingProduct"]!.create).not.toHaveBeenCalled();
  });

  it("turn 2: user podaje bzdurę → odmawia po 3 próbach", async () => {
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_new_product", attempts: 2 });

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ status: "invalid" }),
    });

    const result = await getActionType("qwerty123!!!", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.NEW_PRODUCT_NOT_ADDED);
    expect(db["shoppingProduct"]!.create).not.toHaveBeenCalled();
  });
});

// ── Flow: AI niepewne → user potwierdza / odmawia ────────────────────────────

describe("Flow: awaiting_confirm", () => {
  it("turn 1: AI niepewne → pyta usera o potwierdzenie", async () => {
    db["shoppingProduct"]!.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ action: "add_to_shopping_list" }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ status: "confirm", product_id: 1 }) });

    const result = await getActionType("mleczko", DISCORD_ID);
    expect(result.reply).toContain("mleczko");
    expect(result.reply).toContain("tak/nie");
  });

  it("turn 2: user potwierdza → produkt dodany", async () => {
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ decision: "confirm" }),
    });
    db["shoppingListItem"]!.findFirst.mockResolvedValue(null);
    db["shoppingListItem"]!.create.mockResolvedValue({});
    db["shoppingProduct"]!.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

    const result = await getActionType("tak", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.PRODUCT_ADDED("mleko"));
    expect(db["shoppingListItem"]!.create).toHaveBeenCalled();
  });

  it("turn 2: user odmawia → nic nie dodano", async () => {
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ decision: "decline" }),
    });

    const result = await getActionType("nie", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.DECLINED);
    expect(db["shoppingListItem"]!.create).not.toHaveBeenCalled();
  });

  it("turn 2: user podaje inny produkt → szuka go od nowa", async () => {
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });

    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ decision: "new_product", product_text: "indyk" }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ status: "not_found", product_id: null }) });

    db["shoppingProduct"]!.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);

    const result = await getActionType("tak ale indyk", DISCORD_ID);
    expect(result.reply).toBe(MESSAGES.PRODUCT_NOT_FOUND_ASK_NEW);
  });
});
