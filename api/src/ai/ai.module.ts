import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { FeederModule } from "../feeder/feeder.module";
import { ConversationModule } from "../conversation/conversation.module";

@Module({
  imports: [FeederModule, ConversationModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
