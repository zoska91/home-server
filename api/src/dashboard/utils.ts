import { createCanvas, CanvasRenderingContext2D } from "@napi-rs/canvas";

const W = 600;
const H = 800;
const FONT = "'DejaVu Sans Mono'";

function setupCanvas() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  // rotate 180° so the display is mounted upside down
  ctx.translate(W, H);
  ctx.rotate(Math.PI);
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  return { canvas, ctx };
}

function drawBorder(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

function drawHeader(ctx: CanvasRenderingContext2D, title: string, right: string) {
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 52);
  ctx.lineTo(W, 52);
  ctx.stroke();

  ctx.fillStyle = "#000000";
  ctx.font = `bold 22px ${FONT}`;
  ctx.letterSpacing = "2px";
  ctx.fillText(title, 20, 36);

  ctx.font = `18px ${FONT}`;
  ctx.fillStyle = "#555555";
  const rightW = ctx.measureText(right).width;
  ctx.fillText(right, W - rightW - 20, 36);
  ctx.fillStyle = "#000000";
  ctx.letterSpacing = "0px";
}

function drawFooter(ctx: CanvasRenderingContext2D, text: string) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#bbbbbb";
  ctx.beginPath();
  ctx.moveTo(0, H - 36);
  ctx.lineTo(W, H - 36);
  ctx.stroke();
  ctx.strokeStyle = "#000000";

  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = "#777777";
  ctx.fillText(text, 20, H - 14);
  ctx.fillStyle = "#000000";
}

function formatDate(): string {
  const now = new Date();
  const days = ["Nd", "Pn", "Wt", "Śr", "Czw", "Pt", "Sb"];
  const months = ["Sty", "Lut", "Mar", "Kwi", "Maj", "Cze", "Lip", "Sie", "Wrz", "Paź", "Lis", "Gru"];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// ─── Weather helpers ────────────────────────────────────────────────────────

type WeatherCategory = "clear" | "cloudy" | "fog" | "rain" | "snow" | "storm";

function weatherCategory(code: number): WeatherCategory {
  if (code <= 1) return "clear";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "fog";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "rain";
}

function getDayName(dateStr: string): string {
  const days = ["Nd", "Pn", "Wt", "Śr", "Czw", "Pt", "Sb"];
  return days[new Date(`${dateStr}T12:00:00`).getDay()];
}

function formatTemp(t: number, decimals = 0): string {
  const abs = decimals > 0 ? Math.abs(t).toFixed(decimals) : String(Math.abs(t));
  return `${t < 0 ? "−" : ""}${abs}°`;
}

// ─── Icon drawing ────────────────────────────────────────────────────────────

function drawCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const lw = Math.max(2, size * 0.065);
  ctx.lineWidth = lw;

  const Lx = cx - size * 0.24, Ly = cy + size * 0.04, Lr = size * 0.18;
  const Mx = cx,               My = cy - size * 0.10, Mr = size * 0.24;
  const Rx = cx + size * 0.22, Ry = cy - size * 0.02, Rr = size * 0.20;
  const baseY = cy + size * 0.22;

  ctx.beginPath();
  ctx.arc(Lx, Ly, Lr, Math.PI, 0);
  ctx.arc(Mx, My, Mr, Math.PI, 0);
  ctx.arc(Rx, Ry, Rr, Math.PI, 0);
  ctx.lineTo(Rx + Rr, baseY);
  ctx.lineTo(Lx - Lr, baseY);
  ctx.closePath();
  ctx.stroke();
}

function drawWeatherIcon(ctx: CanvasRenderingContext2D, code: number, cx: number, cy: number, size: number) {
  const cat = weatherCategory(code);
  const lw = Math.max(2, size * 0.065);

  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;

  if (cat === "clear") {
    const r = size * 0.22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r + size * 0.07), cy + Math.sin(a) * (r + size * 0.07));
      ctx.lineTo(cx + Math.cos(a) * (r + size * 0.17), cy + Math.sin(a) * (r + size * 0.17));
      ctx.stroke();
    }
  } else if (cat === "fog") {
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const lineY = cy - size * 0.16 + i * size * 0.17;
      const hw = i === 1 ? size * 0.38 : size * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx - hw, lineY);
      ctx.lineTo(cx + hw, lineY);
      ctx.stroke();
    }
  } else {
    const cloudCy = cat === "cloudy" ? cy : cy - size * 0.12;
    const cloudBottomY = cloudCy + size * 0.22;
    drawCloud(ctx, cx, cloudCy, size);

    if (cat === "rain") {
      ctx.lineWidth = lw * 0.8;
      const dy = cloudBottomY + size * 0.06;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(cx + i * size * 0.19 - size * 0.04, dy);
        ctx.lineTo(cx + i * size * 0.19 + size * 0.04, dy + size * 0.18);
        ctx.stroke();
      }
    } else if (cat === "snow") {
      const dotR = Math.max(2.5, size * 0.055);
      const dotY = cloudBottomY + size * 0.1;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.arc(cx + i * size * 0.19, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (cat === "storm") {
      const bx = cx;
      const by = cloudBottomY + size * 0.05;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(bx + size * 0.06, by);
      ctx.lineTo(bx - size * 0.08, by + size * 0.16);
      ctx.lineTo(bx + size * 0.04, by + size * 0.16);
      ctx.lineTo(bx - size * 0.07, by + size * 0.34);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// VIEW 1: WEATHER
// ─────────────────────────────────────────────
export interface WeatherRenderData {
  tempIndoor?: number;
  tempOutdoor?: number;
  humidity: number;
  tempMeteo: number;
  pressure: number;
  feelsLike: number;
  weatherCode: number;
  forecast: { date: string; tempMax: number; tempMin: number; weatherCode: number }[];
}

export function renderWeather(data: WeatherRenderData): Buffer {
  const { canvas, ctx } = setupCanvas();
  drawBorder(ctx);
  drawHeader(ctx, "POGODA", formatDate());

  // ── Row 1: 3 tiles (no outer box, dividers only) ──────────────────────────
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#cccccc";
  for (const divX of [207, 393]) {
    ctx.beginPath();
    ctx.moveTo(divX, 68);
    ctx.lineTo(divX, 253);
    ctx.stroke();
  }
  ctx.strokeStyle = "#000000";

  const tile1x = 113, tile2x = 300, tile3x = 487;
  const tileValueY = 197;

  ctx.textAlign = "center";

  // Tile 1: indoor temp
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "#555555";
  ctx.fillText("POKÓJ", tile1x, 90);
  if (data.tempIndoor !== undefined) {
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(`${data.tempIndoor.toFixed(1)}°C`, tile1x, tileValueY);
  } else {
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("brak czujnika", tile1x, tileValueY);
  }

  // Tile 2: outdoor temp sensor (placeholder)
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "#555555";
  ctx.fillText("ZEWNĄTRZ", tile2x, 90);
  if (data.tempOutdoor !== undefined) {
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(`${data.tempOutdoor.toFixed(1)}°C`, tile2x, tileValueY);
  } else {
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("brak czujnika", tile2x, tileValueY);
  }

  // Tile 3: humidity
  ctx.font = `11px ${FONT}`;
  ctx.fillStyle = "#555555";
  ctx.fillText("WILGOTNOŚĆ", tile3x, 90);
  ctx.font = `bold 44px ${FONT}`;
  ctx.fillStyle = "#000000";
  ctx.fillText(`${data.humidity}%`, tile3x, tileValueY);

  // ── Row 2: Outdoor temp | Pressure | Weather icon | Feels like ──────────
  const colCenters = [W / 8, (W * 3) / 8, (W * 5) / 8, (W * 7) / 8];

  const col2Labels = ["ZEWNĄTRZ", "CIŚNIENIE", "POGODA", "ODCZUW."];
  const col2Values = [
    { value: formatTemp(data.tempMeteo, 1), fontSize: 36 },
    { value: String(data.pressure), fontSize: 34, unit: "hPa" },
    null,
    { value: formatTemp(data.feelsLike), fontSize: 36 },
  ];

  col2Labels.forEach((label, i) => {
    const x = colCenters[i]!;
    ctx.textAlign = "center";
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = "#666666";
    ctx.fillText(label, x, 300);

    const col = col2Values[i];
    if (col === null) {
      drawWeatherIcon(ctx, data.weatherCode, x, 358, 52);
    } else {
      ctx.font = `bold ${col.fontSize}px ${FONT}`;
      ctx.fillStyle = "#000000";
      ctx.fillText(col.value, x, 370);
      if ("unit" in col) {
        ctx.font = `10px ${FONT}`;
        ctx.fillStyle = "#888888";
        ctx.fillText(col.unit ?? "", x, 390);
      }
    }
  });

  // ── Row 3: 5-day forecast ─────────────────────────────────────────────────
  const colW = W / 5;
  const forecast = data.forecast.slice(0, 5);

  forecast.forEach((day, i) => {
    const cx = colW * i + colW / 2;
    const [, month, dd] = day.date.split("-");

    if (i > 0) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#cccccc";
      ctx.beginPath();
      ctx.moveTo(colW * i, 420);
      ctx.lineTo(colW * i, 764);
      ctx.stroke();
      ctx.strokeStyle = "#000000";
    }

    ctx.textAlign = "center";

    ctx.font = `bold 14px ${FONT}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(getDayName(day.date), cx, 448);

    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = "#888888";
    ctx.fillText(`${dd}.${month}`, cx, 466);

    drawWeatherIcon(ctx, day.weatherCode, cx, 530, 72);

    ctx.font = `bold 22px ${FONT}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(formatTemp(day.tempMax), cx, 622);

    ctx.font = `17px ${FONT}`;
    ctx.fillStyle = "#777777";
    ctx.fillText(formatTemp(day.tempMin), cx, 700);
  });

  ctx.textAlign = "left";
  drawFooter(ctx, `↺ Odświeżono: ${formatTime()}`);
  return canvas.toBuffer("image/png");
}

// ─────────────────────────────────────────────
// VIEW 2: SHOPPING LIST
// ─────────────────────────────────────────────
export interface ShoppingItem {
  id: number;
  name: string;
}

export function renderShopping(items: ShoppingItem[], page = 0): Buffer {
  const { canvas, ctx } = setupCanvas();
  drawBorder(ctx);

  const totalItems = items.length;
  const perPage = 10;
  const totalPages = Math.ceil(totalItems / perPage);
  const currentPage = Math.min(page, totalPages - 1);

  drawHeader(ctx, "LISTA ZAKUPÓW", `${totalItems} produktów`);

  const itemH = 64;
  const startY = 52;
  const pageItems = items.slice(currentPage * perPage, (currentPage + 1) * perPage);

  pageItems.forEach((item, i) => {
    const y = startY + i * itemH;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#cccccc";
    ctx.beginPath();
    ctx.moveTo(0, y + itemH);
    ctx.lineTo(W, y + itemH);
    ctx.stroke();

    ctx.fillStyle = "#000000";
    ctx.fillText(item.name, 56, y + itemH / 2 + 7);
  });

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(0, H - 52);
  ctx.lineTo(W, H - 52);
  ctx.stroke();

  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = "#000000";
  const pageText = `${currentPage + 1} / ${totalPages}`;
  const pw = ctx.measureText(pageText).width;
  ctx.fillText(pageText, W / 2 - pw / 2, H - 22);

  return canvas.toBuffer("image/png");
}
