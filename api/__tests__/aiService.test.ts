import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearConversationStatus, setConversationStatus } from "../src/utils/conversationState";

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

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

const DISCORD_ID = "discord_ai_test";

const actions = [
  { name: "get_shopping_list", description: "..." },
  { name: "feed_cat", description: "..." },
  { name: "get_status_answer", description: "..." },
  { name: "take_snapshot", description: "..." },
  { name: "none", description: "..." },
];

beforeEach(() => {
  vi.clearAllMocks();
  clearConversationStatus(DISCORD_ID);
  mockPrisma["action"]!.findMany.mockResolvedValue(actions);
});

describe("getActionType", () => {
  it("returns shopping list when action is get_shopping_list", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ action: "get_shopping_list" }) });
    mockPrisma["shoppingListItem"]!.findMany.mockResolvedValue([
      { product: { name: "mleko" } },
    ]);

    const result = await getActionType("co mam na liście?", DISCORD_ID);
    expect(result.reply).toContain("mleko");
  });

  it("returns status for get_status_answer", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ action: "get_status_answer" }) });
    const result = await getActionType("jaki mam status?", DISCORD_ID);
    expect(result.reply).toBe("no_state");
  });

  it("returns snapshot URL for take_snapshot", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ action: "take_snapshot" }) });
    const result = await getActionType("pokaż zdjęcie", DISCORD_ID);
    expect(result.reply).toBe("http://192.168.1.100/snapshot");
  });

  it("handles awaiting_confirm state without calling AI for action type", async () => {
    setConversationStatus(DISCORD_ID, { state: "awaiting_confirm", product_id: 1 });
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ decision: "decline" }) });

    const result = await getActionType("nie", DISCORD_ID);
    expect(result.reply).toBe("Ok, nie dodałam tego produktu.");
    expect(mockPrisma["action"]!.findMany).not.toHaveBeenCalled();
  });

  it("handles awaiting_new_product state", async () => {
    setConversationStatus(DISCORD_ID, { state: "awaiting_new_product", attempts: 0 });
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify({ status: "cancelled" }) });

    const result = await getActionType("nieważne", DISCORD_ID);
    expect(result.reply).toBe("Ok, anulowano.");
  });

  it("falls back to AI reply for 'none' action", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ action: "none" }) })
      .mockResolvedValueOnce({ text: "Nie rozumiem o co chodzi." });

    const result = await getActionType("bla bla", DISCORD_ID);
    expect(result.reply).toBe("Nie rozumiem o co chodzi.");
  });
});
