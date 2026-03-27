import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { NotFoundException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

describe("UsersService", () => {
  let service: UsersService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(UsersService);
  });

  describe("findOrCreate", () => {
    it("returns existing user without creating", async () => {
      const user = { id: 1, discordId: "abc", username: "Zofia", isAdmin: false, isAi: true, createdAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const { user: result, created } = await service.findOrCreate({ discord_id: "abc", username: "Zofia" });
      expect(created).toBe(false);
      expect(result.discordId).toBe("abc");
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it("creates new user when not found", async () => {
      const newUser = { id: 2, discordId: "xyz", username: "Jan", isAdmin: false, isAi: false, createdAt: new Date() };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const { user: result, created } = await service.findOrCreate({ discord_id: "xyz", username: "Jan" });
      expect(created).toBe(true);
      expect(result.username).toBe("Jan");
    });
  });

  describe("findByDiscordId", () => {
    it("returns user when found", async () => {
      const user = { id: 1, discordId: "abc", username: "Zofia" };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      await expect(service.findByDiscordId("abc")).resolves.toEqual(user);
    });

    it("throws NotFoundException when not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findByDiscordId("unknown")).rejects.toThrow(NotFoundException);
    });
  });
});
