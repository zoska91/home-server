import { Module } from "@nestjs/common";
import { FeederController } from "./feeder.controller";
import { FeederService } from "./feeder.service";
import { FeederClient } from "./feeder.client";

@Module({
  controllers: [FeederController],
  providers: [FeederService, FeederClient],
  exports: [FeederService],
})
export class FeederModule {}
