import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@thegamies/db";
import { syncRuns } from "@thegamies/db/schema";

export async function startSyncRun(
  db: Db,
  kind: string,
  scope?: Record<string, unknown>,
): Promise<string> {
  const [row] = await db
    .insert(syncRuns)
    .values({
      kind,
      status: "running",
      scope: scope ?? null,
    })
    .returning({ id: syncRuns.id });
  return row.id;
}

export async function updateSyncRun(
  db: Db,
  id: string,
  patch: {
    rowsProcessed?: number;
    pages?: number;
    lastIgdbId?: number | null;
  },
): Promise<void> {
  await db
    .update(syncRuns)
    .set({
      ...patch,
      updatedAt: sql`now()`,
    })
    .where(eq(syncRuns.id, id));
}

export async function finishSyncRun(
  db: Db,
  id: string,
  patch: {
    status: "success" | "error";
    rowsProcessed?: number;
    pages?: number;
    lastIgdbId?: number | null;
    error?: string | null;
    scope?: Record<string, unknown> | null;
  },
): Promise<void> {
  await db
    .update(syncRuns)
    .set({
      status: patch.status,
      rowsProcessed: patch.rowsProcessed,
      pages: patch.pages,
      lastIgdbId: patch.lastIgdbId,
      error: patch.error ?? null,
      ...(patch.scope !== undefined ? { scope: patch.scope } : {}),
      updatedAt: sql`now()`,
      finishedAt: sql`now()`,
    })
    .where(eq(syncRuns.id, id));
}

export async function getLastSuccessfulSyncDate(
  db: Db,
  kind = "incremental",
): Promise<Date | null> {
  const [row] = await db
    .select({ startedAt: syncRuns.startedAt })
    .from(syncRuns)
    .where(and(eq(syncRuns.status, "success"), eq(syncRuns.kind, kind)))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return row?.startedAt ?? null;
}

export async function listRecentSyncRuns(db: Db, limit = 20) {
  return db
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(limit);
}
