import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { execSync } from "child_process";
import { AppModule } from "./app.module";
import { seed } from "./db/seed";

async function bootstrap() {
  console.log("[startup] Syncing database schema...");
  execSync("npx prisma db push", { stdio: "inherit" });

  console.log("[startup] Running seed...");
  await seed();

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(process.env["PORT"] ?? 8000);
  console.log(`[server] Running on port ${process.env["PORT"] ?? 8000}`);
}

bootstrap();
