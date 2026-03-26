import { GoogleGenAI } from "@google/genai";
import { getConversationStatus } from "../utils/conversationState";
import { basePrompt } from "../prompts/basePrompt";

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });
const model = process.env["BASIC_AI_MODEL"] ?? "gemini-2.0-flash";

export async function handleGetStatusAnswer(discordId: string): Promise<string> {
  const state = getConversationStatus(discordId);
  return state ? (state["state"] as string) : "no_state";
}

export async function getAiReply(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: `${basePrompt}\n${text}`,
  });
  return (response.text ?? "").trim();
}
