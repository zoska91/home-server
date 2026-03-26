import axios from "axios";

const FEEDER_BASE_URL = process.env["FEEDER_BASE_URL"] ?? "http://192.168.1.100";
const FEEDER_STREAM_URL = process.env["FEEDER_STREAM_URL"] ?? "http://192.168.1.100/stream";

async function feederPost(endpoint: string, payload: Record<string, unknown>) {
  const url = `${FEEDER_BASE_URL}${endpoint}`;
  console.log(`[feeder_client] POST ${url} |`, payload);
  const response = await axios.post(url, payload, { timeout: 10_000 });
  return response.data;
}

export async function sendFeedCommand(durationMs: number) {
  return feederPost("/feed", { duration_ms: durationMs });
}

export async function sendLightOnCommand(durationSec: number) {
  return feederPost("/light/on", { duration_sec: durationSec });
}

export async function sendLightOffCommand() {
  return feederPost("/light/off", {});
}

export async function sendFeedStopCommand() {
  return feederPost("/feed/stop", {});
}

export async function sendResetCommand() {
  return feederPost("/reset", {});
}

export function getStreamUrl() {
  return FEEDER_STREAM_URL;
}

export function getSnapshotUrl() {
  return `${FEEDER_BASE_URL}/snapshot`;
}
