import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db/prisma";
import {
  sendFeedCommand,
  sendFeedStopCommand,
  sendLightOffCommand,
  sendLightOnCommand,
  sendResetCommand,
  getSnapshotUrl,
} from "../clients/feeder";
import { getFeedCatPrompt, getTurnOnLightPrompt } from "../prompts/feederPrompt";
import { MESSAGES } from "../messages";

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });
const model = process.env["BASIC_AI_MODEL"] ?? "gemini-2.0-flash";

function parseJson(text: string) {
  return JSON.parse(text.replace(/```(?:json)?\n?/g, "").trim());
}

export async function handleFeedCat(text: string): Promise<string> {
  const configs = await prisma.feederMotorConfig.findMany();
  if (!configs.length) return MESSAGES.NO_MOTOR_CONFIGS;

  const optionsList = configs.map((c) => `${c.name} - ${c.durationMs}ms`).join("\n");
  const response = await ai.models.generateContent({ model, contents: getFeedCatPrompt(text, optionsList) });
  console.log("[feed_cat] AI:", response.text);

  const data = parseJson(response.text ?? "{}");
  const matched =
    configs.find((c) => c.name === data.config_name) ??
    configs.find((c) => c.isDefault) ??
    configs[0]!;

  try {
    await sendFeedCommand(matched.durationMs);
    return MESSAGES.FED_CAT(matched.name, matched.durationMs);
  } catch (e) {
    console.error("[handle_feed_cat]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleFeedCatDefault(): Promise<string> {
  const config = await prisma.feederMotorConfig.findFirst({ where: { isDefault: true } });
  if (!config) return MESSAGES.NO_DEFAULT_MOTOR_CONFIG;

  try {
    await sendFeedCommand(config.durationMs);
    return MESSAGES.FED_CAT_DEFAULT(config.name, config.durationMs);
  } catch (e) {
    console.error("[handle_feed_cat_default]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleTurnOnFeederLight(text: string): Promise<string> {
  const configs = await prisma.feederLightConfig.findMany();
  if (!configs.length) return MESSAGES.NO_LIGHT_CONFIGS;

  const optionsList = configs.map((c) => `${c.name} - ${c.durationSec}s`).join("\n");
  const response = await ai.models.generateContent({ model, contents: getTurnOnLightPrompt(text, optionsList) });
  console.log("[light_on] AI:", response.text);

  const data = parseJson(response.text ?? "{}");
  const matched =
    configs.find((c) => c.name === data.config_name) ??
    configs.find((c) => c.isDefault) ??
    configs[0]!;

  try {
    await sendLightOnCommand(matched.durationSec);
    return matched.durationSec === 0 ? MESSAGES.LIGHT_ON_INDEFINITE : MESSAGES.LIGHT_ON(matched.durationSec);
  } catch (e) {
    console.error("[handle_turn_on_feeder_light]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleTurnOffFeederLight(): Promise<string> {
  try {
    await sendLightOffCommand();
    return MESSAGES.LIGHT_OFF;
  } catch (e) {
    console.error("[handle_turn_off_feeder_light]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleStopFeed(): Promise<string> {
  try {
    await sendFeedStopCommand();
    return MESSAGES.MOTOR_STOPPED;
  } catch (e) {
    console.error("[handle_stop_feed]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleResetFeeder(): Promise<string> {
  try {
    await sendResetCommand();
    return MESSAGES.FEEDER_RESET;
  } catch (e) {
    console.error("[handle_reset_feeder]", e);
    return MESSAGES.ESP32_ERROR;
  }
}

export async function handleTakeSnapshot(): Promise<string> {
  return getSnapshotUrl();
}
