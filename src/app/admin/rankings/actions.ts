"use server";

import { revalidatePath } from "next/cache";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getYearStats } from "@/lib/live-aggregate/service";
import { rebuildYear, tryRefreshYear } from "@/lib/live-aggregate/refresh";
import { setYearRevealed } from "@/lib/live-aggregate/reveal";
import {
  getSiteSettings,
  parseLandingYearsInput,
  setLandingStandingsYears,
  setSiteRankMode,
} from "@/lib/site-settings/service";
import { parseSharedRankMode } from "@/lib/standings/shared-rank";

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
  revalidatePath("/");
  revalidatePath("/standings");
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
  revalidatePath("/");
  revalidatePath("/standings");
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
  revalidatePath("/");
  revalidatePath("/standings");
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

export async function loadLandingYearsAction() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const settings = await getSiteSettings();
  return {
    ok: true as const,
    landingStandingsYears: settings.landingStandingsYears,
  };
}

export async function saveLandingYearsAction(
  raw: string,
): Promise<{
  error?: string;
  ok?: boolean;
  landingStandingsYears?: number[] | null;
}> {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const years = parseLandingYearsInput(raw);
    const saved = await setLandingStandingsYears(years);
    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/admin/rankings");
    return { ok: true, landingStandingsYears: saved.landingStandingsYears };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save years.",
    };
  }
}

export async function saveRankModeAction(
  raw: string,
): Promise<{ error?: string; ok?: boolean; rankMode?: "competition" | "dense" }> {
  const denied = await requireAdmin();
  if (denied) return denied;
  const rankMode = parseSharedRankMode(raw);
  if (raw !== "competition" && raw !== "dense") {
    return { error: "Choose competition or dense numbering." };
  }
  try {
    const saved = await setSiteRankMode(rankMode);
    revalidatePath("/");
    revalidatePath("/standings");
    revalidatePath("/game-of-the-year", "layout");
    revalidatePath("/admin/rankings");
    return { ok: true, rankMode: saved.rankMode };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Could not save numbering.",
    };
  }
}
