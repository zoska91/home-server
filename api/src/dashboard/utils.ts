import { createCanvas, CanvasRenderingContext2D } from "@napi-rs/canvas";

const W = 600;
const H = 800;
const FONT = "'DejaVu Sans Mono'";

function setupCanvas() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";

  return { canvas, ctx };
}

function drawBorder(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  right: string,
) {
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
  const months = [
    "Sty",
    "Lut",
    "Mar",
    "Kwi",
    "Maj",
    "Cze",
    "Lip",
    "Sie",
    "Wrz",
    "Paź",
    "Lis",
    "Gru",
  ];
  return `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────
// VIEW 1: WEATHER
// ─────────────────────────────────────────────
export interface WeatherRenderData {
  tempOutdoor: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  tempIndoor?: number;
}

export function renderWeather(data: WeatherRenderData): Buffer {
  const { canvas, ctx } = setupCanvas();
  drawBorder(ctx);
  drawHeader(ctx, "POGODA", formatDate());

  // ── Blok: temp in home (230px) ──
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#000000";
  ctx.strokeRect(20, 68, W - 40, 230);

  ctx.font = `10px ${FONT}`;
  ctx.fillStyle = "#555555";
  ctx.fillText("TEMPERATURA — POKÓJ", 60, 90);

  if (data.tempIndoor !== undefined) {
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillStyle = "#000000";
    ctx.fillText(`${data.tempIndoor.toFixed(1)}°C`, 55, 210);
  } else {
    ctx.font = `bold 36px ${FONT}`;
    ctx.fillStyle = "#aaaaaa";
    ctx.fillText("brak czujnika", 55, 200);
    ctx.font = `11px ${FONT}`;
    ctx.fillText("(ESP32 + SHT30 nie podłączony)", 55, 240);
    ctx.fillStyle = "#000000";
  }

  // ── Blok: temp outside + humidity (230px) ──
  const col1x = W / 4;
  const col2x = (W / 4) * 3;
  const rowY = 320;
  const blockH = 230;

  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = "#555555";
  ctx.textAlign = "center";
  ctx.fillText("NA ZEWNĄTRZ", col1x, rowY + 60);
  ctx.fillText("WILGOTNOŚĆ", col2x, rowY + 60);
  ctx.fillStyle = "#000000";

  ctx.font = `bold 68px ${FONT}`;
  const sign1 = data.tempOutdoor < 0 ? "−" : "";
  ctx.fillText(
    `${sign1}${Math.abs(data.tempOutdoor).toFixed(1)}°`,
    col1x,
    rowY + 130,
  );
  ctx.fillText(`${data.humidity}%`, col2x, rowY + 130);

  ctx.fillStyle = "#000000";
  ctx.textAlign = "left";

  ctx.lineWidth = 1;
  ctx.strokeStyle = "#cccccc";
  ctx.beginPath();
  ctx.moveTo(W / 2, rowY);
  ctx.lineTo(W / 2, rowY + blockH);
  ctx.stroke();

  // ── section: Wrocław (API) ──
  const divY = 570;
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000000";

  ctx.font = `bold 14px ${FONT}`;
  ctx.fillStyle = "#000000";
  ctx.fillText("WROCŁAW", 20, divY + 14);
  ctx.beginPath();
  ctx.moveTo(110, divY + 10);
  ctx.lineTo(W - 20, divY + 10);
  ctx.stroke();

  // 3 columns: temp, pressure, feels like
  const cols = [
    {
      label: "TEMP.",
      value: `${data.tempOutdoor < 0 ? "−" : ""}${Math.abs(data.tempOutdoor).toFixed(1)}°`,
      x: 100,
    },
    {
      label: "CIŚNIENIE",
      value: `${data.pressure}`,
      unit: "hPa",
      x: W / 2,
    },
    {
      label: "ODCZUW.",
      value: `${data.feelsLike < 0 ? "−" : ""}${Math.abs(data.feelsLike)}°`,
      x: W - 100,
    },
  ];

  cols.forEach(({ label, value, unit, x }) => {
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = "#666666";
    const lw = ctx.measureText(label).width;
    ctx.fillText(label, x - lw / 2, divY + 72);

    ctx.font = `bold 40px ${FONT}`;
    ctx.fillStyle = "#000000";
    const vw = ctx.measureText(value).width;
    ctx.fillText(value, x - vw / 2, divY + 120);

    if (unit) {
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = "#888888";
      const uw = ctx.measureText(unit).width;
      ctx.fillText(unit, x - uw / 2, divY + 140);
    }
  });

  drawFooter(ctx, `↺ Odświeżono: ${formatTime()}`);
  return canvas.toBuffer("image/png");
}

// ─────────────────────────────────────────────
// VIEW 2: SHOPPING LIST
// ─────────────────────────────────────────────
export interface ShoppingItem {
  id: number;
  name: string;
  checked: boolean;
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
  const pageItems = items.slice(
    currentPage * perPage,
    (currentPage + 1) * perPage,
  );

  pageItems.forEach((item, i) => {
    const y = startY + i * itemH;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#cccccc";
    ctx.beginPath();
    ctx.moveTo(0, y + itemH);
    ctx.lineTo(W, y + itemH);
    ctx.stroke();

    ctx.font = item.checked ? `18px ${FONT}` : `bold 18px ${FONT}`;
    ctx.fillStyle = item.checked ? "#aaaaaa" : "#000000";
    ctx.fillText(item.name, 56, y + itemH / 2 + 7);
  });

  // Footer with pagination
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

  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = currentPage < totalPages - 1 ? "#000000" : "#cccccc";

  return canvas.toBuffer("image/png");
}
