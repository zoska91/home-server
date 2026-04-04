import { Module } from "@nestjs/common";
import { Esd3dController } from "./esd3d.controller";
import { Esd3dService } from "./esd3d.service";

@Module({
  controllers: [Esd3dController],
  providers: [Esd3dService],
})
export class Esd3dModule {}
