import { MESSAGES } from "../messages";

export const EVENT_MESSAGES: Record<string, string> = {
  started: MESSAGES.FEEDER_STARTED,
  restarted: MESSAGES.FEEDER_RESTARTED,
  camera_error: MESSAGES.FEEDER_CAMERA_ERROR,
  capture_failed: MESSAGES.FEEDER_CAPTURE_FAILED,
  api_error: MESSAGES.FEEDER_API_ERROR,
  wifi_reconnected: MESSAGES.FEEDER_WIFI_RECONNECTED,
  reset: MESSAGES.FEEDER_RESET_EVENT,
};
