import {
  cronJobsArePaused,
  readCronSettings,
  type CronSettingsKv,
} from "./cron-settings";
import { runEditionFreezeCron, type EditionFreezeCronEnv } from "./edition-freeze-cron";

export type CloudflareScheduledEnv = EditionFreezeCronEnv & {
  CRON_SETTINGS?: CronSettingsKv;
};

/** All Cloudflare Cron Triggers share this gate. Missing KV means jobs run. */
export async function runCloudflareScheduledJobs(
  env: CloudflareScheduledEnv,
): Promise<"paused" | "skipped" | "ok"> {
  const settings = await readCronSettings(env.CRON_SETTINGS);
  if (cronJobsArePaused(settings)) return "paused";
  return runEditionFreezeCron(env);
}
