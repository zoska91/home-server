import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { PrismaService } from "../prisma/prisma.service";
import { MESSAGES } from "../utils/messages";

const mockPrisma = { user: { findUnique: vi.fn() } };
const mockAiService = { getActionType: vi.fn() };

describe("AiController", () => {
  let controller: AiController;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockAiService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    controller = module.get(AiController);
  });

  it("returns no access when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const result = await controller.message({ text: "nakarm kota", discord_id: "unknown" });
    expect(result).toEqual({ reply: MESSAGES.NO_AI_ACCESS });
    expect(mockAiService.getActionType).not.toHaveBeenCalled();
  });

  it("returns no access when user has no AI flag", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1, discordId: "abc", isAi: false });
    const result = await controller.message({ text: "nakarm kota", discord_id: "abc" });
    expect(result).toEqual({ reply: MESSAGES.NO_AI_ACCESS });
  });

  it("calls AiService when user has AI access", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 1, discordId: "abc", isAi: true });
    mockAiService.getActionType.mockResolvedValue({ reply: "Nakarmiono kota!" });

    const result = await controller.message({ text: "nakarm kota", discord_id: "abc" });
    expect(mockAiService.getActionType).toHaveBeenCalledWith("nakarm kota", "abc");
    expect(result).toEqual({ reply: "Nakarmiono kota!" });
  });
});
