import { and, eq } from "drizzle-orm";
import {
  communityEditions,
  tgaYears,
  type Db,
} from "@thegamies/db";
import { getEditionByCommunityYear } from "@/lib/communities/editions";
import { seedEditionCategories } from "@/lib/communities/edition-categories";
import { computeEditionStatus } from "@/lib/communities/edition-status";
import {
  createCommunityTgaYear,
  createTgaCategory,
  createTgaYear,
  addGameNominee,
  getTgaYear,
  isCommunityTgaOptedIn,
  listTgaBallot,
  saveTgaSchedule,
  setTgaEnabled,
  setTgaPromoted,
} from "@/lib/tga-pickem/service";
import { computeTgaStatus } from "@/lib/tga-pickem/status";
import {
  LOADTEST_TGA_LOCKED_YEAR,
  LOADTEST_TGA_OPEN_YEAR,
  loadtestEditionOpenSchedule,
  loadtestTgaLockedSchedule,
  loadtestTgaOpenSchedule,
} from "@/lib/qa/loadtest";

async function firstBallotPicks(year: number, db: Db): Promise<Record<string, string>> {
  const ballot = await listTgaBallot(year, db);
  const picks: Record<string, string> = {};
  for (const category of ballot) {
    const nominee = category.nominees[0];
    if (nominee) picks[category.id] = nominee.id;
  }
  return picks;
}

async function ensureSlate(
  year: number,
  gameId: string,
  db: Db,
): Promise<void> {
  let current = await getTgaYear(year, db);
  if (!current) {
    const created = await createTgaYear(year, db);
    if ("error" in created) throw new Error(`TGA ${year}: ${created.error}`);
    current = await getTgaYear(year, db);
  }
  if (!current) throw new Error(`TGA ${year}: missing after create`);

  const ballot = await listTgaBallot(year, db);
  if (ballot.length === 0) {
    const category = await createTgaCategory(
      year,
      { label: "Game of the Year", kind: "game" },
      db,
    );
    if ("error" in category) throw new Error(`TGA ${year}: ${category.error}`);
    const nominee = await addGameNominee(year, category.id, gameId, db);
    if ("error" in nominee) throw new Error(`TGA ${year}: ${nominee.error}`);
  } else if (ballot.every((row) => row.nominees.length === 0)) {
    const nominee = await addGameNominee(year, ballot[0]!.id, gameId, db);
    if ("error" in nominee) throw new Error(`TGA ${year}: ${nominee.error}`);
  }
}

export async function repairLoadtestTgaYear(
  db: Db,
  input: {
    year: number;
    phase: "open" | "locked";
    communityId: string;
    gameId: string;
    now?: Date;
  },
): Promise<Record<string, string>> {
  const { year, phase, communityId, gameId } = input;
  const now = input.now ?? new Date();
  if (year !== LOADTEST_TGA_OPEN_YEAR && year !== LOADTEST_TGA_LOCKED_YEAR) {
    throw new Error("Refusing to repair a TGA year that is not a load-test year.");
  }

  const promoted = await db
    .select({ year: tgaYears.year, promoted: tgaYears.promoted })
    .from(tgaYears)
    .where(eq(tgaYears.promoted, true))
    .limit(1);
  if (promoted[0] && promoted[0].year === year) {
    const demoted = await setTgaPromoted(year, false, db);
    if ("error" in demoted) throw new Error(`TGA ${year}: ${demoted.error}`);
  }

  await ensureSlate(year, gameId, db);

  const openSchedule = loadtestTgaOpenSchedule(now);
  let saved = await saveTgaSchedule(year, openSchedule, db);
  if ("error" in saved) throw new Error(`TGA ${year}: ${saved.error}`);

  const enabled = await setTgaEnabled(year, true, db);
  if ("error" in enabled) throw new Error(`TGA ${year}: ${enabled.error}`);

  const opted = await isCommunityTgaOptedIn(communityId, year, db);
  if (!opted) {
    const join = await createCommunityTgaYear(communityId, year, db);
    if ("error" in join) throw new Error(`TGA ${year}: ${join.error}`);
  }

  if (phase === "locked") {
    saved = await saveTgaSchedule(year, loadtestTgaLockedSchedule(now), db);
    if ("error" in saved) throw new Error(`TGA ${year}: ${saved.error}`);
  }

  const after = await getTgaYear(year, db);
  if (!after) throw new Error(`TGA ${year}: missing after repair`);
  if (after.promoted) {
    throw new Error(`TGA ${year}: load-test year must not be promoted`);
  }
  const status = computeTgaStatus(after, now);
  if (phase === "open" && status !== "open") {
    throw new Error(`TGA ${year}: expected open, got ${status}`);
  }
  if (phase === "locked" && status !== "locked") {
    throw new Error(`TGA ${year}: expected locked, got ${status}`);
  }
  return firstBallotPicks(year, db);
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
