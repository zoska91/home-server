import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGenerateContent = vi.hoisted(() => vi.fn());

vi.mock("../src/db/prisma", () => ({
  prisma: {
    feederMotorConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    feederLightConfig: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../src/clients/feeder", () => ({
  sendFeedCommand: vi.fn(),
  sendFeedStopCommand: vi.fn(),
  sendLightOnCommand: vi.fn(),
  sendLightOffCommand: vi.fn(),
  sendResetCommand: vi.fn(),
  getSnapshotUrl: vi.fn().mockReturnValue("http://192.168.1.100/snapshot"),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
}));

import { prisma } from "../src/db/prisma";
import * as feederClient from "../src/clients/feeder";
import {
  handleFeedCat,
  handleFeedCatDefault,
  handleTurnOnFeederLight,
  handleTurnOffFeederLight,
  handleStopFeed,
  handleResetFeeder,
  handleTakeSnapshot,
} from "../src/services/feederActions";

const mockPrisma = prisma as unknown as {
  feederMotorConfig: Record<string, ReturnType<typeof vi.fn>>;
  feederLightConfig: Record<string, ReturnType<typeof vi.fn>>;
};

const motorConfigs = [
  { id: 1, name: "sm", durationMs: 8000, isDefault: false },
  { id: 2, name: "md", durationMs: 9000, isDefault: true },
  { id: 3, name: "lg", durationMs: 12000, isDefault: false },
];

const lightConfigs = [
  { id: 1, name: "dm", durationSec: 30, isDefault: false },
  { id: 2, name: "sm", durationSec: 60, isDefault: true },
  { id: 3, name: "lg", durationSec: 120, isDefault: false },
  { id: 4, name: "none", durationSec: 0, isDefault: false },
];

beforeEach(() => vi.clearAllMocks());

// ── handleFeedCat ────────────────────────────────────────────────────────────

describe("handleFeedCat", () => {
  it("returns error when no configs in db", async () => {
    mockPrisma.feederMotorConfig.findMany.mockResolvedValue([]);
    expect(await handleFeedCat("nakarm kota")).toBe("Brak skonfigurowanych porcji w bazie danych!");
  });

  it("sends correct duration when AI returns valid config_name", async () => {
    mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "lg" }) });
    (feederClient.sendFeedCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleFeedCat("daj dużo");
    expect(feederClient.sendFeedCommand).toHaveBeenCalledWith(12000);
    expect(result).toContain("lg");
  });

  it("falls back to default config when AI returns unknown name", async () => {
    mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "unknown" }) });
    (feederClient.sendFeedCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await handleFeedCat("nakarm go");
    expect(feederClient.sendFeedCommand).toHaveBeenCalledWith(9000);
  });

  it("returns error message when ESP32 is unreachable", async () => {
    mockPrisma.feederMotorConfig.findMany.mockResolvedValue(motorConfigs);
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "md" }) });
    (feederClient.sendFeedCommand as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await handleFeedCat("nakarm kota");
    expect(result).toBe("Nie udało się połączyć z karmikiem. Spróbuj ponownie.");
  });
});

// ── handleFeedCatDefault ─────────────────────────────────────────────────────

describe("handleFeedCatDefault", () => {
  it("feeds with default config", async () => {
    mockPrisma.feederMotorConfig.findFirst.mockResolvedValue(motorConfigs[1]);
    (feederClient.sendFeedCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleFeedCatDefault();
    expect(feederClient.sendFeedCommand).toHaveBeenCalledWith(9000);
    expect(result).toContain("md");
  });

  it("returns error when no default config", async () => {
    mockPrisma.feederMotorConfig.findFirst.mockResolvedValue(null);
    const result = await handleFeedCatDefault();
    expect(result).toBe("Brak domyślnej konfiguracji porcji w bazie danych!");
  });
});

// ── handleTurnOnFeederLight ──────────────────────────────────────────────────

describe("handleTurnOnFeederLight", () => {
  it("sends correct duration when AI matches config", async () => {
    mockPrisma.feederLightConfig.findMany.mockResolvedValue(lightConfigs);
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "lg" }) });
    (feederClient.sendLightOnCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleTurnOnFeederLight("zapal na długo");
    expect(feederClient.sendLightOnCommand).toHaveBeenCalledWith(120);
    expect(result).toContain("120s");
  });

  it("returns indefinite message when duration_sec is 0", async () => {
    mockPrisma.feederLightConfig.findMany.mockResolvedValue(lightConfigs);
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify({ config_name: "none" }) });
    (feederClient.sendLightOnCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleTurnOnFeederLight("zapal na zawsze");
    expect(result).toBe("Włączono światło bez limitu czasowego");
  });

  it("returns error when no configs", async () => {
    mockPrisma.feederLightConfig.findMany.mockResolvedValue([]);
    expect(await handleTurnOnFeederLight("zapal")).toBe("Brak skonfigurowanych trybów świateł w bazie danych!");
  });
});

// ── handleTurnOffFeederLight ─────────────────────────────────────────────────

describe("handleTurnOffFeederLight", () => {
  it("turns off light and returns confirmation", async () => {
    (feederClient.sendLightOffCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});
    expect(await handleTurnOffFeederLight()).toBe("Wyłączono światło");
  });

  it("returns error on failure", async () => {
    (feederClient.sendLightOffCommand as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));
    expect(await handleTurnOffFeederLight()).toBe("Nie udało się połączyć z karmikiem. Spróbuj ponownie.");
  });
});

// ── handleStopFeed ───────────────────────────────────────────────────────────

describe("handleStopFeed", () => {
  it("stops motor and returns confirmation", async () => {
    (feederClient.sendFeedStopCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});
    expect(await handleStopFeed()).toBe("Zatrzymano silnik karmika");
  });

  it("returns error on failure", async () => {
    (feederClient.sendFeedStopCommand as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));
    expect(await handleStopFeed()).toBe("Nie udało się połączyć z karmikiem. Spróbuj ponownie.");
  });
});

// ── handleResetFeeder ────────────────────────────────────────────────────────

describe("handleResetFeeder", () => {
  it("resets feeder and returns confirmation", async () => {
    (feederClient.sendResetCommand as ReturnType<typeof vi.fn>).mockResolvedValue({});
    expect(await handleResetFeeder()).toBe("Karmik zostanie zrestartowany");
  });

  it("returns error on failure", async () => {
    (feederClient.sendResetCommand as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("timeout"));
    expect(await handleResetFeeder()).toBe("Nie udało się połączyć z karmikiem. Spróbuj ponownie.");
  });
});

// ── handleTakeSnapshot ───────────────────────────────────────────────────────

describe("handleTakeSnapshot", () => {
  it("returns snapshot URL", async () => {
    const url = await handleTakeSnapshot();
    expect(url).toBe("http://192.168.1.100/snapshot");
  });
});
