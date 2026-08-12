"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getYearStats } from "@/lib/live-aggregate/service";
import { rebuildYear, tryRefreshYear } from "@/lib/live-aggregate/refresh";
import { setYearRevealed } from "@/lib/live-aggregate/reveal";

async function requireAdmin() {
  if (!(await isAdminAuthorized())) {
    return { error: "Unauthorized." } as const;
  }
  return null;
}

export async function setRevealAction(
  year: number,
  revealed: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(year)) return { error: "Invalid year." };
  await setYearRevealed(Math.floor(year), revealed);
  revalidatePath(`/game-of-the-year/${Math.floor(year)}`);
  revalidatePath("/admin/rankings");
  return { ok: true };
}

export async function rebuildYearAction(
  year: number,
): Promise<{ error?: string; ok?: boolean }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(year)) return { error: "Invalid year." };
  try {
    await rebuildYear(Math.floor(year));
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Rebuild failed.",
    };
  }
  revalidatePath(`/game-of-the-year/${Math.floor(year)}`);
  revalidatePath("/admin/rankings");
  return { ok: true };
}

export async function refreshYearAction(
  year: number,
): Promise<{ error?: string; ok?: boolean; reason?: string }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(year)) return { error: "Invalid year." };
  const result = await tryRefreshYear(Math.floor(year));
  revalidatePath(`/game-of-the-year/${Math.floor(year)}`);
  revalidatePath("/admin/rankings");
  return { ok: true, reason: result.reason };
}

export async function loadYearStatsAction(year: number) {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!Number.isFinite(year)) return { error: "Invalid year." };
  const stats = await getYearStats(Math.floor(year));
  return {
    ok: true as const,
    stats: {
      year: stats.year,
      listCount: stats.listCount,
      detailedStatsRevealed: stats.detailedStatsRevealed,
      contribGeneration: stats.contribGeneration,
      scoresGeneration: stats.scoresGeneration,
      standingsVersion: stats.standingsVersion,
      refreshing: stats.refreshing,
    },
  };
}
