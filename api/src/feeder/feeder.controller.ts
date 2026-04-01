import { Controller, Post, Get, Patch, Body, Query, UploadedFile, UseInterceptors, ForbiddenException, BadRequestException } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ConfigService } from "@nestjs/config";
import { IsString, IsBoolean } from "class-validator";
import { FeederService } from "./feeder.service";

class FeederEventDto {
  @IsString()
  type!: string;
}

class FeederSettingsDto {
  @IsBoolean()
  motionNotificationsEnabled!: boolean;
}

@Controller("feeder")
export class FeederController {
  constructor(
    private readonly feederService: FeederService,
    private readonly config: ConfigService,
  ) {}

  @Post("motion")
  @UseInterceptors(FileInterceptor("snapshot"))
  async motion(@UploadedFile() snapshot: Express.Multer.File) {
    if (!snapshot) throw new BadRequestException("No snapshot provided");
    await this.feederService.handleMotion(snapshot.buffer);
    return { status: "ok" };
  }

  @Post("feed/default")
  async feedDefault() {
    const message = await this.feederService.handleFeedCatDefault();
    return { status: "ok", message };
  }

  @Post("event")
  async event(@Body() dto: FeederEventDto) {
    await this.feederService.handleEvent(dto.type);
    return { status: "ok" };
  }

  @Get("settings")
  async getSettings() {
    return this.feederService.getSettings();
  }

  @Patch("settings")
  async updateSettings(@Body() dto: FeederSettingsDto) {
    return this.feederService.setMotionNotifications(dto.motionNotificationsEnabled);
  }

  @Get("nfc")
  async nfc(@Query("token") token: string) {
    if (token !== this.config.get("FEEDER_PASS_NFC")) throw new ForbiddenException();
    await this.feederService.handleFeedCatDefault();
    return { status: "ok" };
  }
}
