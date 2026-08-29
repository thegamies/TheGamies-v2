"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import {
  loadCloudflareCronSettings,
  saveCloudflareCronPaused,
} from "@/lib/cloudflare/cron-settings-store";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function setCloudflareCronPausedAction(
  paused: boolean,
): Promise<{ error?: string; paused?: boolean }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await saveCloudflareCronPaused(paused);
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/scheduled");
  return { paused: result.settings.paused };
}
