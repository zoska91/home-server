import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import { handleFeedCatDefault } from "../services/feederActions";
import { getStreamUrl } from "../clients/feeder";
import { EVENT_MESSAGES } from "../utils/feederMessages";
import { MESSAGES } from "../messages";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const DISCORD_TOKEN = process.env["DISCORD_TOKEN"];
const DISCORD_ALERT_CHANNEL_ID = process.env["DISCORD_ALERT_CHANNEL_ID"] ?? "0";

let lastApiError: Date | null = null;

async function sendDiscordMessage(content: string, fileBytes?: Buffer, filename = "snapshot.jpg") {
  const url = `https://discord.com/api/v10/channels/${DISCORD_ALERT_CHANNEL_ID}/messages`;
  const headers = { Authorization: `Bot ${DISCORD_TOKEN}` };

  if (fileBytes) {
    const form = new FormData();
    form.append("file", fileBytes, { filename, contentType: "image/jpeg" });
    form.append("payload_json", JSON.stringify({ content }));
    await axios.post(url, form, { headers: { ...headers, ...form.getHeaders() } });
  } else {
    await axios.post(url, { content }, { headers });
  }
}

router.post("/motion", upload.single("snapshot"), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ detail: MESSAGES.NO_SNAPSHOT });

  const streamUrl = getStreamUrl();
  try {
    await sendDiscordMessage(MESSAGES.FEEDER_MOTION_ALERT(streamUrl), req.file.buffer);
    return res.json({ status: "ok" });
  } catch (e) {
    return res.status(500).json({ detail: MESSAGES.DISCORD_PUSH_FAILED(e) });
  }
});

router.post("/feed/default", async (_req: Request, res: Response) => {
  const message = await handleFeedCatDefault();
  return res.json({ status: "ok", message });
});

router.post("/event", async (req: Request, res: Response) => {
  const { type } = req.body as { type: string };

  if (type === "api_error") {
    const now = new Date();
    if (lastApiError && now.getTime() - lastApiError.getTime() < 1000 * 60 * 60 * 24) {
      return res.json({ status: "ok" });
    }
    lastApiError = now;
  }

  const message = EVENT_MESSAGES[type] ?? MESSAGES.FEEDER_EVENT_UNKNOWN(type);
  try {
    await sendDiscordMessage(message);
    return res.json({ status: "ok" });
  } catch (e) {
    return res.status(500).json({ detail: MESSAGES.DISCORD_PUSH_FAILED(e) });
  }
});

router.get("/nfc", async (req: Request, res: Response) => {
  if (req.query["token"] !== process.env["FEEDER_PASS_NFC"]) {
    return res.status(403).json({ detail: MESSAGES.FORBIDDEN });
  }
  await handleFeedCatDefault();
  return res.json({ status: "ok" });
});

export default router;
