import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class FeederClient {
  private readonly baseUrl: string;
  private readonly streamUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get("FEEDER_BASE_URL") ?? "http://192.168.1.100";
    this.streamUrl = config.get("FEEDER_STREAM_URL") ?? "http://192.168.1.100/stream";
  }

  private async post(endpoint: string, payload: Record<string, unknown>) {
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`[feeder_client] POST ${url}`, payload);
    const res = await axios.post(url, payload, { timeout: 10_000 });
    return res.data;
  }

  sendFeed(durationMs: number) { return this.post("/feed", { duration_ms: durationMs }); }
  sendFeedStop() { return this.post("/feed/stop", {}); }
  sendLightOn(durationSec: number) { return this.post("/light/on", { duration_sec: durationSec }); }
  sendLightOff() { return this.post("/light/off", {}); }
  sendReset() { return this.post("/reset", {}); }
  getStreamUrl() { return this.streamUrl; }
  getSnapshotUrl() { return `${this.baseUrl}/snapshot`; }
}
