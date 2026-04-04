import { Injectable } from "@nestjs/common";
import { renderShopping, renderWeather, ShoppingItem } from "./utils";
import { TDashboardView, TWeatherDataOpenMeteo } from "./dashboard.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDisplay(view: TDashboardView, page: number) {
    const weatherDataOpenMeteo = await this.getWeatherDataOpenMeteo();
    const shoppingItems = await this.getShoppingItems();

    let imageView;

    if (view === "weather")
      imageView = renderWeather({
        tempIndoor: 21.3,
        ...weatherDataOpenMeteo,
      });

    if (view === "shopping") imageView = renderShopping(shoppingItems, page);

    return imageView;
  }

  async getWeatherDataOpenMeteo() {
    const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=51.1079&longitude=17.0385&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe%2FWarsaw&forecast_days=5`;

    const resp = await fetch(API_URL);
    const data = (await resp.json()) as TWeatherDataOpenMeteo;

    return {
      feelsLike: Math.round(data.current.apparent_temperature),
      pressure: Math.round(data.current.surface_pressure),
      tempMeteo: data.current.temperature_2m,
      humidity: Math.round(data.current.relative_humidity_2m),
      weatherCode: data.current.weather_code,
      forecast: data.daily.time.map((date, i) => ({
        date,
        tempMax: Math.round(data.daily.temperature_2m_max[i]!),
        tempMin: Math.round(data.daily.temperature_2m_min[i]!),
        weatherCode: data.daily.weather_code[i]!,
      })),
    };
  }

  async getShoppingItems() {
    const items = await this.prisma.shoppingListItem.findMany({
      include: { product: true },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.product.name,
    }));
  }

  async getPageCount() {
    const count = await this.prisma.shoppingListItem.count();
    return Math.ceil(count / 10);
  }
}
