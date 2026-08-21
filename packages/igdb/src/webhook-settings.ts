export type WebhookProcessingMode = "queued" | "live";

export type WebhookDrainSettings = {
  /** queued = buffer then drain; live = apply on each IGDB delivery. */
  processingMode: WebhookProcessingMode;
  intervalMinutes: number;
  maxMessagesPerDrain: number;
  paused: boolean;
  lastDrainAt: string | null;
};

export const DEFAULT_WEBHOOK_DRAIN_SETTINGS: WebhookDrainSettings = {
  processingMode: "queued",
  intervalMinutes: 15,
  maxMessagesPerDrain: 25,
  paused: false,
  lastDrainAt: null,
};

export const WEBHOOK_SETTINGS_KV_KEY = "drain";

export function clampProcessingMode(
  value: unknown,
): WebhookProcessingMode {
  return value === "live" ? "live" : "queued";
}

export function clampDrainSettings(
  input: Partial<WebhookDrainSettings>,
): WebhookDrainSettings {
  const rawInterval = Number(input.intervalMinutes);
  const intervalMinutes = Math.min(
    24 * 60,
    Math.max(
      1,
      Number.isFinite(rawInterval) ? Math.floor(rawInterval) : 15,
    ),
  );
  const rawBatch = Number(input.maxMessagesPerDrain);
  const maxMessagesPerDrain = Math.min(
    100,
    Math.max(
      1,
      Number.isFinite(rawBatch) ? Math.floor(rawBatch) : 25,
    ),
  );
  return {
    processingMode: clampProcessingMode(input.processingMode),
    intervalMinutes,
    maxMessagesPerDrain,
    paused: Boolean(input.paused),
    lastDrainAt:
      typeof input.lastDrainAt === "string" || input.lastDrainAt === null
        ? input.lastDrainAt
        : null,
  };
}

export function shouldRunDrain(
  settings: WebhookDrainSettings,
  now = new Date(),
): boolean {
  if (settings.paused) return false;
  // Live mode applies on ingress; skip automatic pulls unless forced.
  if (settings.processingMode === "live") return false;
  if (!settings.lastDrainAt) return true;
  const last = Date.parse(settings.lastDrainAt);
  if (!Number.isFinite(last)) return true;
  const elapsedMs = now.getTime() - last;
  return elapsedMs >= settings.intervalMinutes * 60_000;
}
