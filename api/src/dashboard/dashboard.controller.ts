import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Response } from "express";
import { TDashboardView } from "./dashboard.types";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("display")
  @Header("Content-Type", "image/png")
  async getDisplay(
    @Query("view") view: TDashboardView = "weather",
    @Query("page") page: string = "0",
    @Res() res: Response,
  ) {
    const png = await this.dashboardService.getDisplay(view, parseInt(page));
    res.setHeader("Content-Type", "image/png");

    if (view === "shopping") {
      const pageCount = await this.dashboardService.getPageCount();
      res.setHeader("X-Page-Count", String(pageCount));
    }

    res.send(png);
  }

  @Post("home-temp")
  async saveHomeTemp(
    @Body("temp_sht") tempInside: string,
    @Body("temp_ds") tempOutside: string,
    @Body("humidity") humidity: string,
  ) {
    await this.dashboardService.saveHomeTemp(tempInside, tempOutside, humidity);
  }
}
