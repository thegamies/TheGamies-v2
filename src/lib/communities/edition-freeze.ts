import { and, eq, inArray, isNotNull, lte, or, sql } from "drizzle-orm";
import { communityEditions, createDb, type Db } from "@thegamies/db";
import {
  ensureEditionResultsFrozen,
  getEditionResultsMeta,
  rebuildEditionResultsFrozen,
} from "./edition-results";
import { computeEditionStatus } from "./edition-status";

function getDb(): Db {
  return createDb();
}

export type EditionFreezeStatus =
  | "idle"
  | "pending"
  | "computing"
  | "ready"
  | "failed";

const STALE_COMPUTING_MS = 10 * 60 * 1000;

/** Mark closed editions that still need a freeze as pending. */
export async function markClosedEditionsPendingFreeze(
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<number> {
  const result = await db
    .update(communityEditions)
    .set({
      freezeStatus: "pending",
      freezeError: null,
      updatedAt: now,
    })
    .where(
      and(
        isNotNull(communityEditions.closesAt),
        lte(communityEditions.closesAt, now),
        inArray(communityEditions.freezeStatus, ["idle", "failed"]),
      ),
    )
    .returning({ id: communityEditions.id });
  return result.length;
}

/**
 * Claim exclusive compute. Returns false if another worker holds the job
 * or results are already ready.
 */
export async function claimEditionFreeze(
  editionId: string,
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<boolean> {
  const meta = await getEditionResultsMeta(editionId, db);
  if (meta) {
    await db
      .update(communityEditions)
      .set({
        freezeStatus: "ready",
        freezeError: null,
        freezeStartedAt: null,
        updatedAt: now,
      })
      .where(eq(communityEditions.id, editionId));
    return false;
  }

  const staleBefore = new Date(now.getTime() - STALE_COMPUTING_MS);
  const claimed = await db
    .update(communityEditions)
    .set({
      freezeStatus: "computing",
      freezeStartedAt: now,
      freezeError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(communityEditions.id, editionId),
        or(
          inArray(communityEditions.freezeStatus, ["pending", "failed", "idle"]),
          and(
            eq(communityEditions.freezeStatus, "computing"),
            lte(communityEditions.freezeStartedAt, staleBefore),
          ),
        ),
      ),
    )
    .returning({ id: communityEditions.id });

  return claimed.length > 0;
}

export async function markEditionFreezeReady(
  editionId: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .update(communityEditions)
    .set({
      freezeStatus: "ready",
      freezeError: null,
      freezeStartedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(communityEditions.id, editionId));
}

export async function markEditionFreezeFailed(
  editionId: string,
  error: string,
  db: Db = getDb(),
): Promise<void> {
  await db
    .update(communityEditions)
    .set({
      freezeStatus: "failed",
      freezeError: error.slice(0, 500),
      freezeStartedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(communityEditions.id, editionId));
}

/** Run freeze for one edition if claim succeeds. */
export async function runEditionFreezeJob(
  editionId: string,
  opts: { rebuild?: boolean } = {},
  db: Db = getDb(),
): Promise<"skipped" | "ready" | "failed"> {
  const claimed = await claimEditionFreeze(editionId, db);
  if (!claimed) {
    const meta = await getEditionResultsMeta(editionId, db);
    return meta ? "ready" : "skipped";
  }

  try {
    const result = opts.rebuild
      ? await rebuildEditionResultsFrozen(editionId, db)
      : await ensureEditionResultsFrozen(editionId, db);
    if (result && "error" in result) {
      await markEditionFreezeFailed(editionId, result.error, db);
      return "failed";
    }
    await markEditionFreezeReady(editionId, db);
    return "ready";
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not freeze edition results.";
    await markEditionFreezeFailed(editionId, message, db);
    return "failed";
  }
}

/** Cron batch: pending-ize closed editions, then freeze up to `limit`. */
export async function processEditionFreezeQueue(
  opts: { limit?: number } = {},
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<{ pendingMarked: number; processed: number; ready: number; failed: number }> {
  const pendingMarked = await markClosedEditionsPendingFreeze(db, now);
  const limit = Math.min(20, Math.max(1, opts.limit ?? 5));

  const candidates = await db
    .select({ id: communityEditions.id })
    .from(communityEditions)
    .where(
      and(
        isNotNull(communityEditions.closesAt),
        lte(communityEditions.closesAt, now),
        inArray(communityEditions.freezeStatus, [
          "pending",
          "failed",
          "computing",
        ]),
      ),
    )
    .orderBy(sql`${communityEditions.closesAt} asc nulls last`)
    .limit(limit);

  let processed = 0;
  let ready = 0;
  let failed = 0;
  for (const row of candidates) {
    const outcome = await runEditionFreezeJob(row.id, {}, db);
    if (outcome === "skipped") continue;
    processed += 1;
    if (outcome === "ready") ready += 1;
    else failed += 1;
  }

  return { pendingMarked, processed, ready, failed };
}

/** Fire-and-forget freeze after schedule writes (does not block the response). */
export function scheduleEditionFreeze(editionId: string, rebuild = false) {
  const run = async () => {
    try {
      await runEditionFreezeJob(editionId, { rebuild });
    } catch {
      // Next page/cron will retry via pending/failed.
    }
  };

  try {
    void import("next/server")
      .then((mod) => {
        if (typeof mod.after === "function") {
          mod.after(run);
        } else {
          void run();
        }
      })
      .catch(() => {
        void run();
      });
  } catch {
    void run();
  }
}

/** Kick freeze when an edition is closed or published and not ready. */
export async function maybeKickEditionFreeze(
  edition: {
    id: string;
    opensAt: Date | null;
    closesAt: Date | null;
    publishesAt: Date | null;
    freezeStatus: EditionFreezeStatus;
  },
  opts: { rebuild?: boolean; previousStatus?: string } = {},
  db: Db = getDb(),
  now: Date = new Date(),
): Promise<void> {
  const status = computeEditionStatus(edition, now);
  if (status !== "closed" && status !== "published") return;
  if (edition.freezeStatus === "ready") {
    const meta = await getEditionResultsMeta(edition.id, db);
    if (meta) return;
  }

  if (edition.freezeStatus === "idle" || edition.freezeStatus === "failed") {
    await db
      .update(communityEditions)
      .set({
        freezeStatus: "pending",
        freezeError: null,
        updatedAt: now,
      })
      .where(eq(communityEditions.id, edition.id));
  }

  const rebuild =
    opts.rebuild ||
    (opts.previousStatus != null &&
      opts.previousStatus !== "published" &&
      status === "published");

  scheduleEditionFreeze(edition.id, rebuild);
}
