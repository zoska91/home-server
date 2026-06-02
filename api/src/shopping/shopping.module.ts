import { Module } from "@nestjs/common";
import { ShoppingController } from "./shopping.controller";
import { ShoppingService } from "./shopping.service";
import { ShoppingAiService } from "./shopping-ai.service";
import { ConversationModule } from "../conversation/conversation.module";

@Module({
  imports: [ConversationModule],
  controllers: [ShoppingController],
  providers: [ShoppingService, ShoppingAiService],
  exports: [ShoppingService, ShoppingAiService],
})
export class ShoppingModule {}
