import { and, desc, eq } from "drizzle-orm";
import {
  communityEditions,
  createDb,
  type Db,
} from "@thegamies/db";
import {
  computeEditionStatus,
  parseEditionDateTimeInput,
  parseEditionYear,
  type EditionStatus,
  validateEditionSchedule,
} from "./edition-status";
import { canManageCommunity } from "./rules";
import { getCommunityBySlug } from "./service";
import {
  ensureEditionResultsFrozen,
  rebuildEditionResultsFrozen,
} from "./edition-results";

export type CommunityEdition = typeof communityEditions.$inferSelect;

export type CommunityEditionPublic = CommunityEdition & {
  status: EditionStatus;
};

function getDb(): Db {
  return createDb();
}

function withStatus(
  edition: CommunityEdition,
  now: Date = new Date(),
): CommunityEditionPublic {
  return {
    ...edition,
    status: computeEditionStatus(edition, now),
  };
}

/**
 * Freeze on first publish. If the edition left published (reopened) and
 * publishes again, rebuild so new ballots are included.
 */
async function afterEditionWrite(
  edition: CommunityEdition,
  db: Db,
  now: Date = new Date(),
  previousStatus?: EditionStatus,
): Promise<CommunityEditionPublic> {
  const publicEdition = withStatus(edition, now);
  if (publicEdition.status === "published") {
    if (previousStatus != null && previousStatus !== "published") {
      await rebuildEditionResultsFrozen(edition.id, db);
    } else {
      await ensureEditionResultsFrozen(edition.id, db);
    }
  }
  return publicEdition;
}

export async function listEditionsForCommunity(
  communityId: string,
  db: Db = getDb(),
): Promise<CommunityEditionPublic[]> {
  const rows = await db
    .select()
    .from(communityEditions)
    .where(eq(communityEditions.communityId, communityId))
    .orderBy(desc(communityEditions.year));
  const now = new Date();
  return rows.map((row) => withStatus(row, now));
}

export async function getFeaturedEditionForCommunity(
  communityId: string,
  db: Db = getDb(),
): Promise<CommunityEditionPublic | null> {
  const editions = await listEditionsForCommunity(communityId, db);
  return pickFeaturedEdition(editions);
}

/**
 * Prefer an active ceremony for the current year, else the latest non-draft,
 * else the latest draft (hosts). Public pages should hide drafts.
 */
export function pickFeaturedEdition(
  editions: CommunityEditionPublic[],
  currentYear: number = new Date().getUTCFullYear(),
): CommunityEditionPublic | null {
  if (editions.length === 0) return null;
  const current = editions.find((e) => e.year === currentYear);
  if (current && current.status !== "draft") return current;
  const nonDraft = editions.filter((e) => e.status !== "draft");
  if (nonDraft.length > 0) {
    const open = nonDraft.find((e) => e.status === "open");
    if (open) return open;
    const scheduled = nonDraft.find((e) => e.status === "scheduled");
    if (scheduled) return scheduled;
    const closed = nonDraft.find((e) => e.status === "closed");
    if (closed) return closed;
    return nonDraft[0] ?? null;
  }
  return current ?? editions[0] ?? null;
}

export async function getEditionByCommunityYear(
  communityId: string,
  year: number,
  db: Db = getDb(),
): Promise<CommunityEditionPublic | null> {
  const [row] = await db
    .select()
    .from(communityEditions)
    .where(
      and(
        eq(communityEditions.communityId, communityId),
        eq(communityEditions.year, year),
      ),
    )
    .limit(1);
  return row ? withStatus(row) : null;
}

export async function createCommunityEdition(
  slug: string,
  profileId: string,
  yearRaw: unknown,
  db: Db = getDb(),
): Promise<CommunityEditionPublic | { error: string }> {
  const yearParsed = parseEditionYear(yearRaw);
  if ("error" in yearParsed) return yearParsed;

  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can create editions." };
  }

  const existing = await getEditionByCommunityYear(
    detail.id,
    yearParsed.year,
    db,
  );
  if (existing) {
    return { error: "That year already has an edition." };
  }

  try {
    const [created] = await db
      .insert(communityEditions)
      .values({
        communityId: detail.id,
        year: yearParsed.year,
      })
      .returning();
    if (!created) return { error: "Could not create that edition." };
    return withStatus(created);
  } catch {
    return { error: "Could not create that edition." };
  }
}

export async function setCommunityEditionSchedule(
  slug: string,
  profileId: string,
  input: {
    year: unknown;
    opensAt: string;
    closesAt: string;
    publishesAt: string;
  },
  db: Db = getDb(),
): Promise<CommunityEditionPublic | { error: string }> {
  const yearParsed = parseEditionYear(input.year);
  if ("error" in yearParsed) return yearParsed;

  const opens = parseEditionDateTimeInput(input.opensAt);
  if ("error" in opens) return { error: opens.error };
  const closes = parseEditionDateTimeInput(input.closesAt);
  if ("error" in closes) return { error: closes.error };
  const publishes = parseEditionDateTimeInput(input.publishesAt);
  if ("error" in publishes) return { error: publishes.error };

  const scheduleError = validateEditionSchedule(
    opens.date,
    closes.date,
    publishes.date,
  );
  if (scheduleError) return { error: scheduleError };

  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can schedule editions." };
  }

  const existing = await getEditionByCommunityYear(
    detail.id,
    yearParsed.year,
    db,
  );
  const previousStatus = existing?.status;

  const [updated] = await db
    .update(communityEditions)
    .set({
      opensAt: opens.date,
      closesAt: closes.date,
      publishesAt: publishes.date,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(communityEditions.communityId, detail.id),
        eq(communityEditions.year, yearParsed.year),
      ),
    )
    .returning();

  if (!updated) return { error: "Edition not found." };
  return afterEditionWrite(updated, db, new Date(), previousStatus);
}

export async function setCommunityEditionTimestampNow(
  slug: string,
  profileId: string,
  input: {
    year: unknown;
    field: "opensAt" | "closesAt" | "publishesAt";
  },
  db: Db = getDb(),
): Promise<CommunityEditionPublic | { error: string }> {
  const yearParsed = parseEditionYear(input.year);
  if ("error" in yearParsed) return yearParsed;

  const detail = await getCommunityBySlug(slug, profileId, db);
  if (!detail) return { error: "Community not found." };
  if (!canManageCommunity(detail.viewerRole)) {
    return { error: "Only hosts can update editions." };
  }

  const edition = await getEditionByCommunityYear(
    detail.id,
    yearParsed.year,
    db,
  );
  if (!edition) return { error: "Edition not found." };

  const previousStatus = edition.status;
  const now = new Date();
  const next = {
    opensAt: edition.opensAt,
    closesAt: edition.closesAt,
    publishesAt: edition.publishesAt,
    [input.field]: now,
  };

  // Setting one field to now still requires a full valid schedule when all are set.
  if (next.opensAt && next.closesAt && next.publishesAt) {
    const scheduleError = validateEditionSchedule(
      next.opensAt,
      next.closesAt,
      next.publishesAt,
    );
    if (scheduleError) return { error: scheduleError };
  }

  const [updated] = await db
    .update(communityEditions)
    .set({
      ...next,
      updatedAt: now,
    })
    .where(eq(communityEditions.id, edition.id))
    .returning();

  if (!updated) return { error: "Could not update that edition." };
  return afterEditionWrite(updated, db, now, previousStatus);
}
