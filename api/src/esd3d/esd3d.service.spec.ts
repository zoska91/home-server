import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import axios from "axios";
import { Esd3dService, ContactFormDto } from "./esd3d.service";
import { PrismaService } from "../prisma/prisma.service";

vi.mock("axios", () => ({
  default: { post: vi.fn() },
}));

const mockPrisma = {
  esd3dContactSubmission: {
    create: vi.fn(),
  },
};

const mockConfig = {
  get: vi.fn((key: string) => {
    const values: Record<string, string> = {
      DISCORD_TOKEN: "discord-token",
      DISCORD_ALERT_CHANNEL_ID: "channel-id",
    };
    return values[key];
  }),
};

const dto: ContactFormDto = {
  name: "Jan Kowalski",
  company: "Kowal CNC",
  email: "jan@example.com",
  phone: "123456789",
  quantity: "10",
  material: "PLA",
  message: "Prosze o wycene elementow.",
};

describe("Esd3dService", () => {
  let service: Esd3dService;
  const axiosPost = vi.mocked(axios.post);

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.esd3dContactSubmission.create.mockResolvedValue({
      id: 42,
      createdAt: new Date("2026-05-16T12:00:00.000Z"),
      ...dto,
    });

    const module = await Test.createTestingModule({
      providers: [
        Esd3dService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(Esd3dService);
  });

  it("stores contact submission and sends it to Discord", async () => {
    await service.sendContactForm(dto);

    expect(mockPrisma.esd3dContactSubmission.create).toHaveBeenCalledWith({
      data: {
        name: "Jan Kowalski",
        company: "Kowal CNC",
        email: "jan@example.com",
        phone: "123456789",
        quantity: "10",
        material: "PLA",
        message: "Prosze o wycene elementow.",
      },
    });
    expect(axiosPost).toHaveBeenCalledWith(
      "https://discord.com/api/v10/channels/channel-id/messages",
      {
        content: expect.stringContaining("ID: 42"),
      },
      { headers: { Authorization: "Bot discord-token" } },
    );
    const payload = axiosPost.mock.calls[0]?.[1] as { content: string };
    expect(payload.content).toContain("Email: jan@example.com");
    expect(payload.content).toContain("Material: PLA");
  });

  it("stores optional company and phone as null when they are missing", async () => {
    await service.sendContactForm({ ...dto, company: undefined, phone: undefined });

    expect(mockPrisma.esd3dContactSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        company: null,
        phone: null,
      }),
    });
    const payload = axiosPost.mock.calls[0]?.[1] as { content: string };
    expect(payload.content).not.toContain("Firma:");
    expect(payload.content).not.toContain("Telefon:");
  });

  it("does not send Discord message when database insert fails", async () => {
    mockPrisma.esd3dContactSubmission.create.mockRejectedValue(new Error("db down"));

    await expect(service.sendContactForm(dto)).rejects.toThrow("db down");
    expect(axiosPost).not.toHaveBeenCalled();
  });
});
