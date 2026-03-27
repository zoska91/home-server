import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";
import { Response } from "express";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("display")
  @Header("Content-Type", "image/png")
  async getDisplay(
    @Query("view") view: string = "weather",
    @Query("page") page: string = "0",
    @Res() res: Response,
  ) {
    const png = await this.dashboardService.getDisplay(view, parseInt(page));
    res.setHeader("Content-Type", "image/png");
    res.send(png);
  }
}
