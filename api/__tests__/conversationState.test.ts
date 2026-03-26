import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  setConversationStatus,
  getConversationStatus,
  clearConversationStatus,
} from "../src/utils/conversationState";

describe("conversationState", () => {
  const discordId = "user123";

  beforeEach(() => {
    clearConversationStatus(discordId);
  });

  it("returns null when no state exists", () => {
    expect(getConversationStatus(discordId)).toBeNull();
  });

  it("saves and retrieves state", () => {
    setConversationStatus(discordId, { state: "awaiting_confirm", product_id: 5 });
    const state = getConversationStatus(discordId);
    expect(state?.["state"]).toBe("awaiting_confirm");
    expect(state?.["product_id"]).toBe(5);
  });

  it("clears state", () => {
    setConversationStatus(discordId, { state: "awaiting_new_product" });
    clearConversationStatus(discordId);
    expect(getConversationStatus(discordId)).toBeNull();
  });

  it("returns null after expiry", () => {
    vi.useFakeTimers();
    setConversationStatus(discordId, { state: "awaiting_confirm" });
    vi.advanceTimersByTime(301_000); // 5 min + 1s
    expect(getConversationStatus(discordId)).toBeNull();
    vi.useRealTimers();
  });

  it("does not expire before timeout", () => {
    vi.useFakeTimers();
    setConversationStatus(discordId, { state: "awaiting_confirm" });
    vi.advanceTimersByTime(299_000); // 4 min 59s
    expect(getConversationStatus(discordId)).not.toBeNull();
    vi.useRealTimers();
  });
});
