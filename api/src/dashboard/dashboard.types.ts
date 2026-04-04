export type TDashboardView = "weather" | "shopping";

export type TWeatherDataOpenMeteo = {
  current: {
    apparent_temperature: number;
    surface_pressure: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};
