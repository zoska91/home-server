import { Injectable } from "@nestjs/common";

@Injectable()
export class DashboardService {
  async getDisplay(view: string, page: number) {
    return {
      image_url: `http://192.168.31.85:8000/dashboard/image?view=${view}&page=${page}`,
      refresh_rate: 900,
      page_count: 1,
    };
  }
}
