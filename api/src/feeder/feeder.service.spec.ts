import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ConfigService } from "@nestjs/config";
import { FeederService } from "./feeder.service";
import { FeederClient } from "./feeder.client";
import { PrismaService } from "../prisma/prisma.service";
import { MESSAGES } from "../utils/messages";

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
  feederMotorConfig: { findMany: vi.fn(), findFirst: vi.fn() },
  feederLightConfig: { findMany: vi.fn() },
};

const mockFeederClient = {
  sendFeed: vi.fn(),
  sendFeedStop: vi.fn(),
  sendLightOn: vi.fn(),
  sendLightOff: vi.fn(),
  sendReset: vi.fn(),
  getStreamUrl: vi.fn().mockReturnValue("http://192.168.1.100/stream"),
  getSnapshotUrl: vi.fn().mockReturnValue("http://192.168.1.100/snapshot"),
};

const mockConfig = { get: vi.fn().mockReturnValue("gemini-2.0-flash") };

const motorConfigs = [
  { id: 1, name: "sm", durationMs: 8000, isDefault: false },
  { id: 2, name: "md", durationMs: 9000, isDefault: true },
  { id: 3, name: "lg", durationMs: 12000, isDefault: false },
];

const lightConfigs = [
  { id: 1, name: "dm", durationSec: 30, isDefault: false },
  { id: 2, name: "sm", durationSec: 60, isDefault: true },
  { id: 3, name: "none", durationSec: 0, isDefault: false },
];

describe("FeederService", () => {
  let service: FeederService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        FeederService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FeederClient, useValue: mockFeederClient },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();
    service = module.get(FeederService);
  });

  describe("handleFeedCat", () => {
    it("returns error when no configs", async () => {
      mockPrisma.feederMotorConfig.findMany.mockResolvedValue([]);
      expect(await service.handleFeedCat("nakarm")).toBe(MESSAGES.NO_MOTOR_CONFIGS);
    });

    it("sends correct duration for matched config", async () => {
      mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "lg" }) });
      mockFeederClient.sendFeed.mockResolvedValue({});

      const result = await service.handleFeedCat("daj dużo");
      expect(mockFeederClient.sendFeed).toHaveBeenCalledWith(12000);
      expect(result).toBe(MESSAGES.FED_CAT("lg", 12000));
    });

    it("falls back to default when config not matched", async () => {
      mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "unknown" }) });
      mockFeederClient.sendFeed.mockResolvedValue({});

      await service.handleFeedCat("nakarm go");
      expect(mockFeederClient.sendFeed).toHaveBeenCalledWith(9000);
    });

    it("returns ESP32 error when connection fails", async () => {
      mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "md" }) });
      mockFeederClient.sendFeed.mockRejectedValue(new Error("ECONNREFUSED"));

      expect(await service.handleFeedCat("nakarm")).toBe(MESSAGES.ESP32_ERROR);
    });
  });

  describe("handleFeedCatDefault", () => {
    it("feeds with default config", async () => {
      mockPrisma.feederMotorConfig.findFirst.mockResolvedValue(motorConfigs[1]);
      mockFeederClient.sendFeed.mockResolvedValue({});

      await service.handleFeedCatDefault();
      expect(mockFeederClient.sendFeed).toHaveBeenCalledWith(9000);
    });

    it("returns error when no default config", async () => {
      mockPrisma.feederMotorConfig.findFirst.mockResolvedValue(null);
      expect(await service.handleFeedCatDefault()).toBe(MESSAGES.NO_DEFAULT_MOTOR_CONFIG);
    });
  });

  describe("handleTurnOnLight", () => {
    it("sends correct duration", async () => {
      mockPrisma.feederLightConfig.findMany.mockResolvedValue(lightConfigs);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "sm" }) });
      mockFeederClient.sendLightOn.mockResolvedValue({});

      const result = await service.handleTurnOnLight("zapal światło");
      expect(mockFeederClient.sendLightOn).toHaveBeenCalledWith(60);
      expect(result).toBe(MESSAGES.LIGHT_ON(60));
    });

    it("returns indefinite message when duration is 0", async () => {
      mockPrisma.feederLightConfig.findMany.mockResolvedValue(lightConfigs);
      mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "none" }) });
      mockFeederClient.sendLightOn.mockResolvedValue({});

      expect(await service.handleTurnOnLight("zapal na zawsze")).toBe(MESSAGES.LIGHT_ON_INDEFINITE);
    });
  });

  describe("handleTurnOffLight", () => {
    it("turns off light", async () => {
      mockFeederClient.sendLightOff.mockResolvedValue({});
      expect(await service.handleTurnOffLight()).toBe(MESSAGES.LIGHT_OFF);
    });

    it("returns error on failure", async () => {
      mockFeederClient.sendLightOff.mockRejectedValue(new Error("timeout"));
      expect(await service.handleTurnOffLight()).toBe(MESSAGES.ESP32_ERROR);
    });
  });

  describe("handleStopFeed", () => {
    it("stops motor", async () => {
      mockFeederClient.sendFeedStop.mockResolvedValue({});
      expect(await service.handleStopFeed()).toBe(MESSAGES.FEED_STOPPED);
    });

    it("returns error on failure", async () => {
      mockFeederClient.sendFeedStop.mockRejectedValue(new Error("timeout"));
      expect(await service.handleStopFeed()).toBe(MESSAGES.ESP32_ERROR);
    });
  });

  describe("handleResetFeeder", () => {
    it("resets feeder", async () => {
      mockFeederClient.sendReset.mockResolvedValue({});
      expect(await service.handleResetFeeder()).toBe(MESSAGES.FEEDER_RESET);
    });
  });

  describe("handleTakeSnapshot", () => {
    it("returns snapshot URL", () => {
      expect(service.handleTakeSnapshot()).toBe("http://192.168.1.100/snapshot");
    });
  });
});
