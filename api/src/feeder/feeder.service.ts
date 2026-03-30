import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Ollama } from "ollama";
import axios from "axios";
import FormData from "form-data";
import { PrismaService } from "../prisma/prisma.service";
import { FeederClient } from "./feeder.client";
import {
  getFeedCatPrompt,
  getTurnOnLightPrompt,
} from "../prompts/feeder.prompt";
import { MESSAGES } from "../utils/messages";
import { EVENT_MESSAGES } from "../utils/feederMessages";

@Injectable()
export class FeederService {
  private readonly ollama: Ollama;
  private readonly model: string;
  private lastApiError: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly feederClient: FeederClient,
    private readonly config: ConfigService,
  ) {
    this.ollama = new Ollama({
      host: config.get("OLLAMA_HOST") ?? "http://host.docker.internal:11434",
    });
    this.model = config.get("BASIC_AI_MODEL") ?? "llama3.2:3b";
  }

  private parseJson(text: string) {
    return JSON.parse(text.replace(/```(?:json)?\n?/g, "").trim());
  }

  private async generate(prompt: string): Promise<string> {
    const response = await this.ollama.generate({
      model: this.model,
      prompt,
      stream: false,
    });
    return response.response.trim();
  }

  async handleFeedCat(text: string): Promise<string> {
    const configs = await this.prisma.feederMotorConfig.findMany();
    if (!configs.length) return MESSAGES.NO_MOTOR_CONFIGS;

    const optionsList = configs
      .map((c) => `${c.name} - ${c.durationMs}ms`)
      .join("\n");
    const raw = await this.generate(getFeedCatPrompt(text, optionsList));
    const data = this.parseJson(raw);

    const matched =
      configs.find((c) => c.name === data.config_name) ??
      configs.find((c) => c.isDefault) ??
      configs[0]!;
    try {
      await this.feederClient.sendFeed(matched.durationMs);
      return MESSAGES.FED_CAT(matched.name, matched.durationMs);
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  async handleFeedCatDefault(): Promise<string> {
    const config = await this.prisma.feederMotorConfig.findFirst({
      where: { isDefault: true },
    });
    if (!config) return MESSAGES.NO_DEFAULT_MOTOR_CONFIG;
    try {
      await this.feederClient.sendFeed(config.durationMs);
      return MESSAGES.FED_CAT_DEFAULT(config.name, config.durationMs);
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  async handleTurnOnLight(text: string): Promise<string> {
    const configs = await this.prisma.feederLightConfig.findMany();
    if (!configs.length) return MESSAGES.NO_LIGHT_CONFIGS;

    const optionsList = configs
      .map((c) => `${c.name} - ${c.durationSec}s`)
      .join("\n");
    const raw = await this.generate(getTurnOnLightPrompt(text, optionsList));
    const data = this.parseJson(raw);

    const matched =
      configs.find((c) => c.name === data.config_name) ??
      configs.find((c) => c.isDefault) ??
      configs[0]!;
    try {
      await this.feederClient.sendLightOn(matched.durationSec);
      return matched.durationSec === 0
        ? MESSAGES.LIGHT_ON_INDEFINITE
        : MESSAGES.LIGHT_ON(matched.durationSec);
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  async handleTurnOffLight(): Promise<string> {
    try {
      await this.feederClient.sendLightOff();
      return MESSAGES.LIGHT_OFF;
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  async handleStopFeed(): Promise<string> {
    try {
      await this.feederClient.sendFeedStop();
      return MESSAGES.FEED_STOPPED;
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  async handleResetFeeder(): Promise<string> {
    try {
      await this.feederClient.sendReset();
      return MESSAGES.FEEDER_RESET;
    } catch {
      return MESSAGES.ESP32_ERROR;
    }
  }

  handleTakeSnapshot(): string {
    return this.feederClient.getSnapshotUrl();
  }

  async sendDiscordMessage(
    content: string,
    fileBytes?: Buffer,
    filename = "snapshot.jpg",
  ) {
    const token = this.config.get("DISCORD_TOKEN");
    const channelId = this.config.get("DISCORD_ALERT_CHANNEL_ID");
    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const headers = { Authorization: `Bot ${token}` };

    if (fileBytes) {
      const form = new FormData();
      form.append("file", fileBytes, { filename, contentType: "image/jpeg" });
      form.append("payload_json", JSON.stringify({ content }));
      await axios.post(url, form, {
        headers: { ...headers, ...form.getHeaders() },
      });
    } else {
      await axios.post(url, { content }, { headers });
    }
  }

  async handleMotion(imageBuffer: Buffer): Promise<void> {
    const streamUrl = this.feederClient.getStreamUrl();
    const message = `🐱 Wykryto ruch przy karmiku!\n📹 Podgląd na żywo: ${streamUrl}`;
    await this.sendDiscordMessage(message, imageBuffer);
  }

  async handleEvent(type: string): Promise<boolean> {
    if (type === "api_error") {
      const now = new Date();
      if (
        this.lastApiError &&
        now.getTime() - this.lastApiError.getTime() < 1000 * 60 * 60 * 24
      ) {
        return false;
      }
      this.lastApiError = now;
    }
    const message = EVENT_MESSAGES[type] ?? `ℹ️ Karmnik: ${type}`;
    await this.sendDiscordMessage(message);
    return true;
  }
}
