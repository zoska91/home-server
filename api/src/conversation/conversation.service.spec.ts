import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ConversationService } from "./conversation.service";

describe("ConversationService", () => {
  let service: ConversationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ConversationService],
    }).compile();
    service = module.get(ConversationService);
  });

  it("returns null when no state set", () => {
    expect(service.get("user1")).toBeNull();
  });

  it("saves and retrieves state", () => {
    service.set("user1", { state: "awaiting_confirm", product_id: 5 });
    expect(service.get("user1")?.["state"]).toBe("awaiting_confirm");
    expect(service.get("user1")?.["product_id"]).toBe(5);
  });

  it("clears state", () => {
    service.set("user1", { state: "awaiting_new_product" });
    service.clear("user1");
    expect(service.get("user1")).toBeNull();
  });

  it("returns null after 5 min expiry", () => {
    vi.useFakeTimers();
    service.set("user1", { state: "awaiting_confirm" });
    vi.advanceTimersByTime(301_000);
    expect(service.get("user1")).toBeNull();
    vi.useRealTimers();
  });

  it("does not expire before 5 min", () => {
    vi.useFakeTimers();
    service.set("user1", { state: "awaiting_confirm" });
    vi.advanceTimersByTime(299_000);
    expect(service.get("user1")).not.toBeNull();
    vi.useRealTimers();
  });
});
