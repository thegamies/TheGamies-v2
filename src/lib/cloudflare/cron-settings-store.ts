import {
  readCronSettings,
  writeCronSettings,
  type CronSettings,
  type CronSettingsKv,
} from "@/lib/cloudflare/cron-settings";

async function getCronSettingsKv(): Promise<CronSettingsKv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    const kv = env.CRON_SETTINGS as CronSettingsKv | undefined;
    if (!kv?.get || !kv?.put) return null;
    return kv;
  } catch {
    return null;
  }
}

export async function loadCloudflareCronSettings(): Promise<
  { ok: true; settings: CronSettings } | { ok: false; error: string }
> {
  const kv = await getCronSettingsKv();
  if (!kv) {
    return {
      ok: false,
      error: "Scheduled jobs can be paused from the Cloudflare site.",
    };
  }
  return { ok: true, settings: await readCronSettings(kv) };
}

export async function saveCloudflareCronPaused(
  paused: boolean,
): Promise<
  { ok: true; settings: CronSettings } | { ok: false; error: string }
> {
  const kv = await getCronSettingsKv();
  if (!kv) {
    return {
      ok: false,
      error: "Scheduled jobs can be paused from the Cloudflare site.",
    };
  }
  return { ok: true, settings: await writeCronSettings(kv, paused) };
}
