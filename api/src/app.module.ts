import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { UsersModule } from "./users/users.module";
import { ShoppingModule } from "./shopping/shopping.module";
import { FeederModule } from "./feeder/feeder.module";
import { AiModule } from "./ai/ai.module";
import { seed } from "./db/seed";
import { DashboardModule } from "./dashboard/dashboard.module";
import { Esd3dModule } from "./esd3d/esd3d.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    ShoppingModule,
    FeederModule,
    AiModule,
    DashboardModule,
    Esd3dModule,
  ],
})
export class AppModule implements OnModuleInit {
  async onModuleInit() {
    await seed();
  }
}
