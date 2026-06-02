import { Module } from "@nestjs/common";
import { AiController } from "./ai.controller";
import { AiService } from "./ai.service";
import { FeederModule } from "../feeder/feeder.module";
import { ConversationModule } from "../conversation/conversation.module";
import { ShoppingModule } from "../shopping/shopping.module";

@Module({
  imports: [FeederModule, ConversationModule, ShoppingModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
