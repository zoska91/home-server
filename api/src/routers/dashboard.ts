import { Router, Request, Response } from "express";
import * as https from "https";
import * as http from "http";

const router = Router();

router.get("/display", async (req: Request, res: Response) => {
  // Pobierz pogodę z open-meteo
  const weatherUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=51.1&longitude=17.03&current=temperature_2m,relative_humidity_2m,weather_code";

  const weatherData = await fetchJson(weatherUrl);
  const temp = weatherData.current.temperature_2m;
  const humidity = weatherData.current.relative_humidity_2m;
  const code = weatherData.current.weather_code;
  const desc = weatherDesc(code);

  // Wygeneruj obrazek PNG jako SVG -> PNG
  // Na razie zwróć JSON z URL do obrazka
  // TRMNL oczekuje: { image_url: "...", refresh_rate: 900 }

  // Generujemy obrazek jako prosty PNG przez Canvas lub zwracamy SVG
  const imageUrl = `http://192.168.31.85:8000/dashboard/image?temp=${temp}&humidity=${humidity}&desc=${encodeURIComponent(desc)}`;

  return res.json({
    image_url: imageUrl,
    refresh_rate: 900,
  });
});

router.get("/image", async (req: Request, res: Response) => {
  const temp = req.query.temp || "--";
  const humidity = req.query.humidity || "--";
  const desc = req.query.desc || "--";

  const svg = `<svg width="600" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="600" height="800" fill="white"/>
    <text x="300" y="150" font-size="48" text-anchor="middle" fill="black">Wrocław</text>
    <text x="300" y="320" font-size="120" text-anchor="middle" fill="black">${temp}°C</text>
    <text x="300" y="450" font-size="48" text-anchor="middle" fill="black">${desc}</text>
    <text x="300" y="550" font-size="36" text-anchor="middle" fill="black">Wilgotność: ${humidity}%</text>
  </svg>`;

  res.setHeader("Content-Type", "image/svg+xml");
  return res.send(svg);
});

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = "";
        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

function weatherDesc(code: number): string {
  if (code === 0) return "Bezchmurnie";
  if (code <= 3) return "Częściowe zachmurzenie";
  if (code <= 48) return "Mgła";
  if (code <= 67) return "Deszcz";
  if (code <= 77) return "Śnieg";
  if (code <= 82) return "Przelotne opady";
  if (code <= 99) return "Burza";
  return "Nieznana pogoda";
}

export default router;
