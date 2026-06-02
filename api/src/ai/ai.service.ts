import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { FeederService } from "../feeder/feeder.service";
import { ConversationService } from "../conversation/conversation.service";
import { getActionTypePrompt } from "../prompts/actions.prompt";
import { basePrompt } from "../prompts/base.prompt";
import { MESSAGES } from "../utils/messages";
import { ShoppingAiService } from "../shopping/shopping-ai.service";
import { Ollama } from "ollama";

@Injectable()
export class AiService {
  private readonly ollama: Ollama;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly feederService: FeederService,
    private readonly conversationService: ConversationService,
    private readonly shoppingAiService: ShoppingAiService,
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

  private async generate(contents: string): Promise<string> {
    const response = await this.ollama.generate({
      model: this.model,
      prompt: contents,
      stream: false,
    });
    return response.response.trim();
  }

  async getActionType(
    text: string,
    discordId: string,
  ): Promise<{ reply: string }> {
    const stateReply = await this.handleConversationState(text, discordId);
    if (stateReply) return { reply: stateReply };

    const actions = await this.prisma.action.findMany();
    const actionList = actions
      .map((a) => `- ${a.name}: ${a.description}`)
      .join("\n");
    const raw = await this.generate(getActionTypePrompt(actionList, text));
    console.log("[ai_action] raw:", raw);

    const action: string = this.parseJson(raw).action ?? "none";
    console.log("[ai_action]", action);

    const reply = await this.handleAction(action, text, discordId);
    return { reply };
  }

  private async handleConversationState(
    text: string,
    discordId: string,
  ): Promise<string | null> {
    const state = this.conversationService.get(discordId);
    if (!state) return null;

    console.log("[state]", discordId + ":", JSON.stringify(state));
    return this.shoppingAiService.handleConversationState(
      text,
      discordId,
      this.generate.bind(this),
    );
  }

  private async handleAction(
    action: string,
    text: string,
    discordId: string,
  ): Promise<string> {
    const shoppingReply = await this.shoppingAiService.handleAction(
      action,
      text,
      discordId,
      this.generate.bind(this),
    );
    if (shoppingReply) return shoppingReply;

    switch (action) {
      case "get_status_answer":
        return (
          (this.conversationService.get(discordId)?.["state"] as string) ??
          "no_state"
        );
      case "feed_cat":
        return this.feederService.handleFeedCat(text);
      case "turn_on_feeder_light":
        return this.feederService.handleTurnOnLight(text);
      case "turn_off_feeder_light":
        return this.feederService.handleTurnOffLight();
      case "stop_feed":
        return this.feederService.handleStopFeed();
      case "reset_feeder":
        return this.feederService.handleResetFeeder();
      case "take_snapshot":
        return this.feederService.handleTakeSnapshot();
      case "enable_motion_notifications":
        await this.feederService.setMotionNotifications(true);
        return MESSAGES.MOTION_NOTIFICATIONS_ENABLED;
      case "disable_motion_notifications":
        await this.feederService.setMotionNotifications(false);
        return MESSAGES.MOTION_NOTIFICATIONS_DISABLED;
      default:
        return this.generate(`${basePrompt}\n${text}`);
    }
  }
}
