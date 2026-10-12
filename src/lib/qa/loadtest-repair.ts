import { and, eq } from "drizzle-orm";
import { communityEditions, type Db } from "@thegamies/db";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { seedEditionCategories } from "@/lib/communities/edition-categories";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import {
  createCommunityTgaYear,
  getTgaYear,
  isCommunityTgaOptedIn,
  listTgaBallot,
  saveTgaSchedule,
  setTgaEnabled,
} from "@/lib/tga-pickem/service";
import { computeTgaStatus } from "@/lib/tga-pickem/status";
import {
  LOADTEST_TGA_YEAR,
  completeLoadtestTgaPicks,
  loadtestEditionOpenSchedule,
  loadtestTgaLockedSchedule,
  loadtestTgaOpenSchedule,
  type LoadtestTgaSlateCategory,
} from "@/lib/qa/loadtest";

export async function snapshotLoadtestTgaSlate(
  db: Db,
  year: number = LOADTEST_TGA_YEAR,
): Promise<LoadtestTgaSlateCategory[]> {
  if (year !== LOADTEST_TGA_YEAR) {
    throw new Error("Refusing to repair a TGA year that is not the load-test year.");
  }
  const current = await getTgaYear(year, db);
  if (!current) {
    throw new Error(`TGA ${year} is missing; Pick’em load uses the real slate.`);
  }
  const ballot = await listTgaBallot(year, db);
  const slate = ballot.map((category) => ({
    id: category.id,
    nomineeIds: category.nominees.map((nominee) => nominee.id),
  }));
  if (slate.length === 0 || slate.every((row) => row.nomineeIds.length === 0)) {
    throw new Error(`TGA ${year} has no nominees to fill.`);
  }
  return slate;
}

export async function attachLoadtestTgaCommunity(
  db: Db,
  input: { year: number; communityId: string },
): Promise<{
  slate: LoadtestTgaSlateCategory[];
  picks: Record<string, string>;
}> {
  const { year, communityId } = input;
  const slate = await snapshotLoadtestTgaSlate(db, year);
  const enabled = await setTgaEnabled(year, true, db);
  if ("error" in enabled) throw new Error(`TGA ${year}: ${enabled.error}`);
  const opted = await isCommunityTgaOptedIn(communityId, year, db);
  if (!opted) {
    const join = await createCommunityTgaYear(communityId, year, db);
    if ("error" in join) throw new Error(`TGA ${year}: ${join.error}`);
  }
  return { slate, picks: completeLoadtestTgaPicks(slate, 0) };
}

export async function restoreLoadtestTgaSchedule(
  db: Db,
  year: number,
  schedule: { opensAt: Date; showStartsAt: Date },
): Promise<void> {
  if (year !== LOADTEST_TGA_YEAR) {
    throw new Error("Refusing to repair a TGA year that is not the load-test year.");
  }
  const saved = await saveTgaSchedule(year, schedule, db);
  if ("error" in saved) throw new Error(`TGA ${year}: ${saved.error}`);
}

export async function repairLoadtestTgaYear(
  db: Db,
  input: {
    year: number;
    phase: "open" | "locked";
    communityId: string;
    now?: Date;
  },
): Promise<{
  slate: LoadtestTgaSlateCategory[];
  picks: Record<string, string>;
}> {
  const { year, phase, communityId } = input;
  const now = input.now ?? new Date();
  const attached = await attachLoadtestTgaCommunity(db, { year, communityId });

  const schedule =
    phase === "locked"
      ? loadtestTgaLockedSchedule(now)
      : loadtestTgaOpenSchedule(now);
  const saved = await saveTgaSchedule(year, schedule, db);
  if ("error" in saved) throw new Error(`TGA ${year}: ${saved.error}`);

  const after = await getTgaYear(year, db);
  if (!after) throw new Error(`TGA ${year}: missing after repair`);
  const status = computeTgaStatus(after, now);
  if (phase === "open" && status !== "open") {
    throw new Error(`TGA ${year}: expected open, got ${status}`);
  }
  if (phase === "locked" && status !== "locked") {
    throw new Error(`TGA ${year}: expected locked, got ${status}`);
  }
  return attached;
}

export async function repairLoadtestOpenEdition(
  db: Db,
  input: { communityId: string; year: number; now?: Date },
): Promise<void> {
  const now = input.now ?? new Date();
  const edition = await getEditionByCommunityYear(
    input.communityId,
    input.year,
    db,
  );
  if (!edition) throw new Error(`Open edition ${input.year} is missing`);
  if (edition.status === "published") {
    throw new Error(
      `Open edition ${input.year} is published; pick a different filling year.`,
    );
  }
  await seedEditionCategories(edition.id, db);
  const schedule = loadtestEditionOpenSchedule(now);
  await db
    .update(communityEditions)
    .set({
      opensAt: schedule.opensAt,
      closesAt: schedule.closesAt,
      publishesAt: schedule.publishesAt,
      updatedAt: now,
    })
    .where(
      and(
        eq(communityEditions.id, edition.id),
        eq(communityEditions.communityId, input.communityId),
      ),
    );
  const refreshed = await getEditionByCommunityYear(
    input.communityId,
    input.year,
    db,
  );
  const status = refreshed
    ? computeEditionStatus(refreshed, now)
    : "missing";
  if (status !== "open") {
    throw new Error(`Open edition ${input.year}: expected open, got ${status}`);
  }
}
