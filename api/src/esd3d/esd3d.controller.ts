import { Controller, Post, Body, HttpCode } from "@nestjs/common";
import { Esd3dService, ContactFormDto } from "./esd3d.service";

@Controller("esd3d")
export class Esd3dController {
  constructor(private readonly esd3dService: Esd3dService) {}

  @Post("email")
  @HttpCode(200)
  async sendEmail(@Body() dto: ContactFormDto) {
    await this.esd3dService.sendContactForm(dto);
    return { status: "ok" };
  }
}
