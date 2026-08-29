export const CRON_SETTINGS_KV_KEY = "cron";

export type CronSettings = {
  /** When true, Cloudflare scheduled handlers return without work. */
  paused: boolean;
};

export const DEFAULT_CRON_SETTINGS: CronSettings = {
  paused: false,
};

export type CronSettingsKv = {
  get(
    key: string,
    options: { type: "json" },
  ): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
};

export function parseCronSettings(raw: unknown): CronSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_CRON_SETTINGS };
  return {
    paused: (raw as { paused?: unknown }).paused === true,
  };
}

export function cronJobsArePaused(settings: CronSettings): boolean {
  return settings.paused;
}

export async function readCronSettings(
  kv: CronSettingsKv | undefined,
): Promise<CronSettings> {
  if (!kv) return { ...DEFAULT_CRON_SETTINGS };
  const raw = await kv.get(CRON_SETTINGS_KV_KEY, { type: "json" });
  return parseCronSettings(raw);
}

export async function writeCronSettings(
  kv: CronSettingsKv,
  paused: boolean,
): Promise<CronSettings> {
  const next: CronSettings = { paused };
  await kv.put(CRON_SETTINGS_KV_KEY, JSON.stringify(next));
  return next;
}
