export type WebhookProcessingMode = "queued" | "live";

/** Queue delivery gate. Cron only flips pause in `auto`. */
export type WebhookDeliveryMode = "auto" | "open" | "closed";

export type WebhookDrainSettings = {
  /** queued = buffer then drain; live = apply on each IGDB delivery. */
  processingMode: WebhookProcessingMode;
  deliveryMode: WebhookDeliveryMode;
  intervalMinutes: number;
  /** How long Auto keeps delivery open each cycle. */
  windowMinutes: number;
  maxMessagesPerDrain: number;
  /** True when deliveryMode is closed (legacy admin field). */
  paused: boolean;
  lastDrainAt: string | null;
  /** Auto: keep delivery open until this instant (Drain now). */
  forceOpenUntil: string | null;
  /** Queue still has work; cron should pull every minute until empty. */
  drainPending: boolean;
};

export type WebhookDrainLock = {
  until: string;
};

export const DEFAULT_WEBHOOK_DRAIN_SETTINGS: WebhookDrainSettings = {
  processingMode: "queued",
  deliveryMode: "auto",
  intervalMinutes: 15,
  windowMinutes: 5,
  maxMessagesPerDrain: 25,
  paused: false,
  lastDrainAt: null,
  forceOpenUntil: null,
  drainPending: false,
};

export const WEBHOOK_SETTINGS_KV_KEY = "drain";
export const WEBHOOK_DRAIN_LOCK_KV_KEY = "drain-lock";

/** Cloudflare Worker fetch budget: cap messages so one isolate stays under ~1000 subrequests. */
export const WORKER_DRAIN_BATCH_CEILING = 40;

export const MAX_DRAIN_HOPS = 100;
/** Same isolate only — Worker-to-Worker hops hit subrequest depth and return `Subrequest…`. */
export const DRAIN_BATCHES_PER_INVOCATION = 3;

export const DRAIN_HOP_HEADER = "x-igdb-drain-hop";
export const DRAIN_CONTINUE_HEADER = "x-igdb-drain-continue";

const VISIBILITY_MS_PER_MESSAGE = 15_000;
const MIN_VISIBILITY_MS = 2 * 60_000;
const MAX_VISIBILITY_MS = 15 * 60_000;

export function clampProcessingMode(
  value: unknown,
): WebhookProcessingMode {
  return value === "live" ? "live" : "queued";
}

export function clampDeliveryMode(
  value: unknown,
  paused?: unknown,
): WebhookDeliveryMode {
  if (value === "open" || value === "closed" || value === "auto") return value;
  if (paused === true) return "closed";
  return "auto";
}

export function clampWindowMinutes(
  windowMinutes: unknown,
  intervalMinutes: number,
): number {
  const raw = Number(windowMinutes);
  const n = Number.isFinite(raw) ? Math.floor(raw) : 5;
  return Math.min(intervalMinutes, Math.max(1, n));
}

/** Next Auto close (UTC), including after an out-of-window Drain now. */
export function nextScheduledCloseAt(
  settings: Pick<WebhookDrainSettings, "intervalMinutes" | "windowMinutes">,
  now = new Date(),
): Date {
  const interval = Math.max(1, settings.intervalMinutes);
  const window = clampWindowMinutes(settings.windowMinutes, interval);
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const pos = minuteOfDay % interval;
  const minutesUntilClose =
    pos < window ? window - pos : interval - pos + window;
  const startOfMinute = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    0,
    0,
  );
  return new Date(startOfMinute + minutesUntilClose * 60_000);
}

/** Whether Cloudflare should deliver queue messages right now (UTC clock). */
export function desiredQueueOpen(
  settings: Pick<
    WebhookDrainSettings,
    "deliveryMode" | "intervalMinutes" | "windowMinutes"
  > & { forceOpenUntil?: string | null },
  now = new Date(),
): boolean {
  if (settings.deliveryMode === "closed") return false;
  if (settings.deliveryMode === "open") return true;
  if (settings.forceOpenUntil) {
    const until = Date.parse(settings.forceOpenUntil);
    if (Number.isFinite(until) && now.getTime() < until) return true;
  }
  const interval = settings.intervalMinutes;
  const window = clampWindowMinutes(settings.windowMinutes, interval);
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  return minuteOfDay % interval < window;
}

export function clampDrainSettings(
  input: Partial<WebhookDrainSettings> & { paused?: unknown },
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
  const deliveryMode = clampDeliveryMode(input.deliveryMode, input.paused);
  return {
    processingMode: clampProcessingMode(input.processingMode),
    deliveryMode,
    intervalMinutes,
    windowMinutes: clampWindowMinutes(input.windowMinutes, intervalMinutes),
    maxMessagesPerDrain,
    paused: deliveryMode === "closed",
    lastDrainAt:
      typeof input.lastDrainAt === "string" || input.lastDrainAt === null
        ? input.lastDrainAt
        : null,
    forceOpenUntil:
      typeof input.forceOpenUntil === "string" || input.forceOpenUntil === null
        ? input.forceOpenUntil
        : null,
    drainPending: Boolean(input.drainPending),
  };
}

export function parseDrainLock(value: unknown): WebhookDrainLock | null {
  if (!value || typeof value !== "object") return null;
  const until = (value as { until?: unknown }).until;
  if (typeof until !== "string" || !Number.isFinite(Date.parse(until))) {
    return null;
  }
  return { until };
}

export function isDrainLocked(
  lock: WebhookDrainLock | null | undefined,
  now = new Date(),
): boolean {
  if (!lock?.until) return false;
  const ts = Date.parse(lock.until);
  return Number.isFinite(ts) && ts > now.getTime();
}

export function shouldRunDrain(
  settings: WebhookDrainSettings,
  now = new Date(),
  lock: WebhookDrainLock | null = null,
): boolean {
  if (settings.paused) return false;
  // Live mode applies on ingress; skip automatic pulls unless forced.
  if (settings.processingMode === "live") return false;
  // Leftover queue must keep moving. A long lease lock was parking cron
  // for up to 15 minutes after each batch while 14k waited.
  if (settings.drainPending) return true;
  if (isDrainLocked(lock, now)) return false;
  if (!settings.lastDrainAt) return true;
  const last = Date.parse(settings.lastDrainAt);
  if (!Number.isFinite(last)) return true;
  const elapsedMs = now.getTime() - last;
  return elapsedMs >= settings.intervalMinutes * 60_000;
}

export function drainBatchSize(maxMessagesPerDrain: number): number {
  const raw = Number(maxMessagesPerDrain);
  const n = Number.isFinite(raw) ? Math.floor(raw) : 25;
  return Math.min(WORKER_DRAIN_BATCH_CEILING, Math.max(1, n));
}

export function drainVisibilityTimeoutMs(batchSize: number): number {
  return Math.min(
    MAX_VISIBILITY_MS,
    Math.max(MIN_VISIBILITY_MS, drainBatchSize(batchSize) * VISIBILITY_MS_PER_MESSAGE),
  );
}

export function drainLockUntilIso(batchSize: number, now = new Date()): string {
  return new Date(now.getTime() + drainVisibilityTimeoutMs(batchSize)).toISOString();
}

export function parseDrainHop(value: string | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(MAX_DRAIN_HOPS, Math.floor(n));
}

export function parseDrainContinue(value: string | null | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function shouldChainDrain(emptied: boolean, hop: number): boolean {
  return !emptied && hop + 1 < MAX_DRAIN_HOPS;
}

/**
 * Pull responses may put the dashboard count on `metadata.metrics.backlog_count`
 * (and sometimes still on `message_backlog_count`). Missing is not zero.
 */
export function parseQueuePullBacklogCount(result: unknown): number | null {
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  const metadata = row.metadata;
  if (metadata && typeof metadata === "object") {
    const metrics = (metadata as Record<string, unknown>).metrics;
    if (metrics && typeof metrics === "object") {
      const n = (metrics as Record<string, unknown>).backlog_count;
      if (typeof n === "number" && Number.isFinite(n)) return n;
    }
  }
  const legacy = row.message_backlog_count;
  if (typeof legacy === "number" && Number.isFinite(legacy)) return legacy;
  return null;
}

/**
 * A short pull is not an empty queue. Unknown backlog is also not empty —
 * HTTP pull can return [] while the dashboard still shows thousands leased.
 */
export function isDrainPullExhausted(input: {
  pulled: number;
  batchSize: number;
  retried: number;
  backlogCount: number | null;
}): boolean {
  if (input.retried > 0) return false;
  if (input.backlogCount == null) return false;
  if (input.pulled === 0) return input.backlogCount === 0;
  if (input.pulled >= input.batchSize) return false;
  return input.backlogCount <= input.pulled;
}
