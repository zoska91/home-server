export type TDashboardView = "weather" | "shopping";

export type TWeatherDataOpenMeteo = {
  current: {
    apparent_temperature: number;
    surface_pressure: number;
    temperature_2m: number;
  };
};
