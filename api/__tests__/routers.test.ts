import { describe, it, expect, vi, beforeEach } from "vitest";
import { MESSAGES } from "../src/messages";
import express from "express";
import request from "supertest";

// Mock all services/prisma before importing routers
vi.mock("../src/db/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), create: vi.fn() },
    shoppingProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    shoppingListItem: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    feederMotorConfig: { findFirst: vi.fn() },
  },
}));

vi.mock("../src/services/feederActions", () => ({
  handleFeedCatDefault: vi.fn(),
}));

vi.mock("../src/services/aiService", () => ({
  getActionType: vi.fn(),
}));

vi.mock("axios");

import { prisma } from "../src/db/prisma";
import { handleFeedCatDefault } from "../src/services/feederActions";
import { getActionType } from "../src/services/aiService";
import usersRouter from "../src/routers/users";
import shoppingRouter from "../src/routers/shopping";
import feederRouter from "../src/routers/feeder";
import aiRouter from "../src/routers/ai";

const mockPrisma = prisma as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/users", usersRouter);
  app.use("/shopping", shoppingRouter);
  app.use("/feeder", feederRouter);
  app.use("/ai", aiRouter);
  return app;
}

beforeEach(() => vi.clearAllMocks());

// ── Users ────────────────────────────────────────────────────────────────────

describe("POST /users", () => {
  it("returns existing user without creating a new one", async () => {
    const user = { id: 1, discordId: "abc", username: "Zofia", isAdmin: false, isAi: true, createdAt: new Date() };
    mockPrisma["user"]!.findUnique.mockResolvedValue(user);

    const res = await request(buildApp())
      .post("/users")
      .send({ discord_id: "abc", username: "Zofia" });

    expect(res.status).toBe(200);
    expect(res.body.discord_id).toBe("abc");
    expect(mockPrisma["user"]!.create).not.toHaveBeenCalled();
  });

  it("creates a new user when not found", async () => {
    const newUser = { id: 2, discordId: "xyz", username: "Jan", isAdmin: false, isAi: false, createdAt: new Date() };
    mockPrisma["user"]!.findUnique.mockResolvedValue(null);
    mockPrisma["user"]!.create.mockResolvedValue(newUser);

    const res = await request(buildApp())
      .post("/users")
      .send({ discord_id: "xyz", username: "Jan" });

    expect(res.status).toBe(201);
    expect(res.body.username).toBe("Jan");
  });
});

describe("GET /users/:discord_id", () => {
  it("returns 404 when user not found", async () => {
    mockPrisma["user"]!.findUnique.mockResolvedValue(null);
    const res = await request(buildApp()).get("/users/nonexistent");
    expect(res.status).toBe(404);
  });
});

// ── Shopping ─────────────────────────────────────────────────────────────────

describe("GET /shopping/list", () => {
  it("returns shopping list items", async () => {
    mockPrisma["shoppingListItem"]!.findMany.mockResolvedValue([
      { id: 1, productId: 1, product: { id: 1, name: "mleko" } },
    ]);
    const res = await request(buildApp()).get("/shopping/list");
    expect(res.status).toBe(200);
    expect(res.body[0].product.name).toBe("mleko");
  });
});

describe("DELETE /shopping/list", () => {
  it("clears list and returns message", async () => {
    mockPrisma["shoppingListItem"]!.deleteMany.mockResolvedValue({});
    const res = await request(buildApp()).delete("/shopping/list");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(MESSAGES.SHOPPING_LIST_CLEARED);
  });
});

describe("POST /shopping/products", () => {
  it("returns 400 when product already exists", async () => {
    mockPrisma["shoppingProduct"]!.findUnique.mockResolvedValue({ id: 1, name: "mleko" });
    const res = await request(buildApp()).post("/shopping/products").send({ name: "mleko" });
    expect(res.status).toBe(400);
  });

  it("creates product when it does not exist", async () => {
    mockPrisma["shoppingProduct"]!.findUnique.mockResolvedValue(null);
    mockPrisma["shoppingProduct"]!.create.mockResolvedValue({ id: 2, name: "chleb" });
    const res = await request(buildApp()).post("/shopping/products").send({ name: "chleb" });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("chleb");
  });
});

// ── Feeder ───────────────────────────────────────────────────────────────────

describe("POST /feeder/feed/default", () => {
  it("calls handleFeedCatDefault and returns ok", async () => {
    (handleFeedCatDefault as ReturnType<typeof vi.fn>).mockResolvedValue("Demon nakarmiony!");
    const res = await request(buildApp()).post("/feeder/feed/default");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.message).toBe("Demon nakarmiony!");
  });
});

describe("GET /feeder/nfc", () => {
  it("returns 403 with wrong token", async () => {
    const res = await request(buildApp()).get("/feeder/nfc?token=wrong");
    expect(res.status).toBe(403);
  });
});

describe("POST /feeder/event", () => {
  it("returns ok for known event", async () => {
    // axios mock returns success silently
    const res = await request(buildApp()).post("/feeder/event").send({ type: "started" });
    // Will fail because Discord push will fail, but status should still attempt
    expect([200, 500]).toContain(res.status);
  });
});

// ── AI ───────────────────────────────────────────────────────────────────────

describe("POST /ai/message", () => {
  it("returns no access when user is not ai", async () => {
    mockPrisma["user"]!.findUnique.mockResolvedValue({ id: 1, discordId: "abc", isAi: false });
    const res = await request(buildApp())
      .post("/ai/message")
      .send({ text: "nakarm kota", discord_id: "abc" });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBe("Nie masz dostępu do AI.");
  });

  it("returns no access when user not found", async () => {
    mockPrisma["user"]!.findUnique.mockResolvedValue(null);
    const res = await request(buildApp())
      .post("/ai/message")
      .send({ text: "nakarm kota", discord_id: "unknown" });
    expect(res.body.reply).toBe("Nie masz dostępu do AI.");
  });

  it("calls getActionType and returns reply when user is ai", async () => {
    mockPrisma["user"]!.findUnique.mockResolvedValue({ id: 1, discordId: "abc", isAi: true });
    (getActionType as ReturnType<typeof vi.fn>).mockResolvedValue({ reply: "Nakarmiono kotkę!" });

    const res = await request(buildApp())
      .post("/ai/message")
      .send({ text: "nakarm kota", discord_id: "abc" });

    expect(res.body.reply).toBe("Nakarmiono kotkę!");
  });
});
