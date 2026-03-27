import { Controller, Post, Body } from "@nestjs/common";
import { AiService } from "./ai.service";
import { MessageDto } from "./dto/message.dto";
import { PrismaService } from "../prisma/prisma.service";
import { MESSAGES } from "../utils/messages";

@Controller("ai")
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Post("message")
  async message(@Body() dto: MessageDto) {
    const user = await this.prisma.user.findUnique({
      where: { discordId: dto.discord_id },
    });
    if (!user?.isAi) return { reply: MESSAGES.NO_AI_ACCESS };
    return this.aiService.getActionType(dto.text, dto.discord_id);
  }
}
