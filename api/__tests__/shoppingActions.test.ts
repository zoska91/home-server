import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearConversationStatus, getConversationStatus } from "../src/utils/conversationState";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("../src/db/prisma", () => ({
  prisma: {
    shoppingProduct: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    shoppingListItem: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { prisma } from "../src/db/prisma";
import {
  handleAddToShoppingList,
  handleGetShoppingList,
  handleClearShoppingList,
  handleDeleteFromShoppingList,
  handleCreateNewProduct,
  handleAwaitingConfirm,
} from "../src/services/shoppingActions";

const mockPrisma = prisma as unknown as {
  shoppingProduct: Record<string, ReturnType<typeof vi.fn>>;
  shoppingListItem: Record<string, ReturnType<typeof vi.fn>>;
};

function mockAiJson(obj: unknown) {
  mockGenerateContent.mockResolvedValue({ text: JSON.stringify(obj) });
}

const DISCORD_ID = "user_test_123";

beforeEach(() => {
  vi.clearAllMocks();
  clearConversationStatus(DISCORD_ID);
});

// ── handleGetShoppingList ────────────────────────────────────────────────────

describe("handleGetShoppingList", () => {
  it("returns empty message when list is empty", async () => {
    mockPrisma.shoppingListItem.findMany.mockResolvedValue([]);
    expect(await handleGetShoppingList()).toBe("Lista zakupów jest pusta!");
  });

  it("returns list of product names", async () => {
    mockPrisma.shoppingListItem.findMany.mockResolvedValue([
      { product: { name: "mleko" } },
      { product: { name: "chleb" } },
    ]);
    const result = await handleGetShoppingList();
    expect(result).toContain("mleko");
    expect(result).toContain("chleb");
  });
});

// ── handleClearShoppingList ──────────────────────────────────────────────────

describe("handleClearShoppingList", () => {
  it("clears list and returns confirmation", async () => {
    mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({});
    const result = await handleClearShoppingList();
    expect(result).toBe("Lista zakupów została wyczyszczona!");
    expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledOnce();
  });
});

// ── handleAddToShoppingList ──────────────────────────────────────────────────

describe("handleAddToShoppingList", () => {
  const products = [{ id: 1, name: "mleko" }];

  it("adds product when AI finds exact match", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
    mockAiJson({ status: "found", product_id: 1 });
    mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
    mockPrisma.shoppingListItem.create.mockResolvedValue({});
    mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

    const result = await handleAddToShoppingList("mleko", DISCORD_ID);
    expect(result).toContain("mleko");
    expect(result).toContain("Dodano");
  });

  it("returns already-on-list message when item exists", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
    mockAiJson({ status: "found", product_id: 1 });
    mockPrisma.shoppingListItem.findFirst.mockResolvedValue({ id: 10, productId: 1 });

    const result = await handleAddToShoppingList("mleko", DISCORD_ID);
    expect(result).toBe("Ten produkt jest już na liście zakupów!");
  });

  it("sets awaiting_confirm state when AI is unsure", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
    mockAiJson({ status: "confirm", product_id: 1 });

    await handleAddToShoppingList("mleczko", DISCORD_ID);
    const state = getConversationStatus(DISCORD_ID);
    expect(state?.["state"]).toBe("awaiting_confirm");
    expect(state?.["product_id"]).toBe(1);
  });

  it("sets awaiting_new_product state when product not found", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue(products);
    mockAiJson({ status: "not_found", product_id: null });

    await handleAddToShoppingList("indyk", DISCORD_ID);
    const state = getConversationStatus(DISCORD_ID);
    expect(state?.["state"]).toBe("awaiting_new_product");
  });
});

// ── handleDeleteFromShoppingList ─────────────────────────────────────────────

describe("handleDeleteFromShoppingList", () => {
  it("deletes product and returns confirmation", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);
    mockAiJson({ product_id: 1 });
    mockPrisma.shoppingListItem.findFirst.mockResolvedValue({ id: 5, productId: 1 });
    mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });
    mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({});

    const result = await handleDeleteFromShoppingList("usuń mleko");
    expect(result).toContain("mleko");
    expect(result).toContain("usunięty");
  });

  it("returns error when product not on list", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue([{ id: 1, name: "mleko" }]);
    mockAiJson({ product_id: 1 });
    mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);

    const result = await handleDeleteFromShoppingList("usuń mleko");
    expect(result).toBe("Nie ma tego produktu na liście zakupów!");
  });

  it("returns error when AI returns null product_id", async () => {
    mockPrisma.shoppingProduct.findMany.mockResolvedValue([]);
    mockAiJson({ product_id: null });

    const result = await handleDeleteFromShoppingList("coś dziwnego");
    expect(result).toBe("Taki produkt nie istnieje");
  });
});

// ── handleCreateNewProduct ───────────────────────────────────────────────────

describe("handleCreateNewProduct", () => {
  it("creates product and adds to list on valid input", async () => {
    mockAiJson({ status: "valid", name: "indyk" });
    mockPrisma.shoppingProduct.create.mockResolvedValue({ id: 99, name: "indyk" });
    mockPrisma.shoppingListItem.create.mockResolvedValue({});

    const result = await handleCreateNewProduct("indyk", DISCORD_ID);
    expect(result).toContain("indyk");
    expect(getConversationStatus(DISCORD_ID)).toBeNull();
  });

  it("cancels on user resignation", async () => {
    mockAiJson({ status: "cancelled" });
    const result = await handleCreateNewProduct("nieważne", DISCORD_ID);
    expect(result).toBe("Ok, anulowano.");
  });

  it("increments attempt counter on invalid input", async () => {
    mockAiJson({ status: "invalid" });
    await handleCreateNewProduct("qwerty", DISCORD_ID);
    const state = getConversationStatus(DISCORD_ID);
    expect(state?.["attempts"]).toBe(1);
  });

  it("gives up after 3 invalid attempts", async () => {
    mockAiJson({ status: "invalid" });
    const { setConversationStatus } = await import("../src/utils/conversationState");
    setConversationStatus(DISCORD_ID, { state: "awaiting_new_product", attempts: 2 });

    const result = await handleCreateNewProduct("qwerty", DISCORD_ID);
    expect(result).toBe("Nowy produkt nie został dodany do listy.");
    expect(getConversationStatus(DISCORD_ID)).toBeNull();
  });
});

// ── handleAwaitingConfirm ────────────────────────────────────────────────────

describe("handleAwaitingConfirm", () => {
  it("adds product on confirm", async () => {
    mockAiJson({ decision: "confirm" });
    mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null);
    mockPrisma.shoppingListItem.create.mockResolvedValue({});
    mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });

    const result = await handleAwaitingConfirm("tak", DISCORD_ID, 1);
    expect(result).toContain("mleko");
    expect(getConversationStatus(DISCORD_ID)).toBeNull();
  });

  it("clears state on decline", async () => {
    mockAiJson({ decision: "decline" });
    const result = await handleAwaitingConfirm("nie", DISCORD_ID, 1);
    expect(result).toBe("Ok, nie dodałam tego produktu.");
    expect(getConversationStatus(DISCORD_ID)).toBeNull();
  });

  it("re-searches on new_product decision", async () => {
    mockGenerateContent
      .mockResolvedValueOnce({ text: JSON.stringify({ decision: "new_product", product_text: "indyk" }) })
      .mockResolvedValueOnce({ text: JSON.stringify({ status: "not_found", product_id: null }) });

    mockPrisma.shoppingProduct.findMany.mockResolvedValue([]);

    const result = await handleAwaitingConfirm("tak, ale indyk", DISCORD_ID, 1);
    expect(result).toContain("Nie znalazłam");
  });
});
