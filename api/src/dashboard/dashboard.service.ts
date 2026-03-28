import { Injectable } from "@nestjs/common";
import {
  renderShopping,
  renderWeather,
  ShoppingItem,
  WeatherRenderData,
} from "./utils";
import { TDashboardView } from "./dashboard.types";

const weatherData: WeatherRenderData = {
  tempOutdoor: -2.5,
  feelsLike: -6,
  humidity: 78,
  pressure: 1013,
  tempIndoor: 21.3,
};

const shoppingItems: ShoppingItem[] = [
  { id: 1, name: "mleko", checked: false },
  { id: 2, name: "chleb", checked: false },
  { id: 3, name: "masło", checked: true },
];

@Injectable()
export class DashboardService {
  async getDisplay(view: TDashboardView, page: number) {
    let imageView;
    if (view === "weather") imageView = renderWeather(weatherData);
    if (view === "shopping") imageView = renderShopping(shoppingItems, page);

    return imageView;
  }
}
