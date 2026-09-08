import { eq } from "drizzle-orm";
import {
  activityEvents,
  listItems,
  type Db,
} from "@thegamies/db";
import { diffListGameIds } from "./diff";
import {
  parseListRankVisibility,
  type ActivityKind,
} from "./kinds";

export type ActivityInsert = {
  profileId: string;
  kind: ActivityKind;
  batchId: string;
  gameId?: string | null;
  listId?: string | null;
  createdAt?: Date;
};

export async function insertActivityEvents(
  rows: ActivityInsert[],
  db: Db,
): Promise<void> {
  if (rows.length === 0) return;
  await db.insert(activityEvents).values(
    rows.map((row) => ({
      profileId: row.profileId,
      kind: row.kind,
      batchId: row.batchId,
      gameId: row.gameId ?? null,
      listId: row.listId ?? null,
      createdAt: row.createdAt ?? new Date(),
    })),
  );
}

export async function loadListGameIds(listId: string, db: Db): Promise<string[]> {
  const rows = await db
    .select({ gameId: listItems.gameId })
    .from(listItems)
    .where(eq(listItems.listId, listId));
  return rows.map((row) => row.gameId);
}

export function gotyMembershipEventRows(
  list: {
    id: string;
    profileId: string | null;
    listType: string;
    rankVisibility?: string | null;
  },
  oldGameIds: readonly string[],
  newGameIds: readonly string[],
  batchId: string,
): ActivityInsert[] {
  if (list.listType !== "goty" || !list.profileId) return [];
  if (parseListRankVisibility(list.rankVisibility) === "hidden") return [];
  const { added, removed } = diffListGameIds(oldGameIds, newGameIds);
  if (added.length === 0 && removed.length === 0) return [];
  return [
    ...added.map((gameId) => ({
      profileId: list.profileId as string,
      kind: "list_add" as const,
      batchId,
      gameId,
      listId: list.id,
    })),
    ...removed.map((gameId) => ({
      profileId: list.profileId as string,
      kind: "list_remove" as const,
      batchId,
      gameId,
      listId: list.id,
    })),
  ];
}

export function shouldEmitListReveal(input: {
  listType: string;
  profileId: string | null;
  previous: string | null | undefined;
  next: string | null | undefined;
}): boolean {
  if (input.listType !== "goty" || !input.profileId) return false;
  return (
    parseListRankVisibility(input.next) === "ranked" &&
    parseListRankVisibility(input.previous) !== "ranked"
  );
}

export async function emitGotyMembershipEvents(
  list: {
    id: string;
    profileId: string | null;
    listType: string;
    rankVisibility?: string | null;
  },
  oldGameIds: readonly string[],
  newGameIds: readonly string[],
  db: Db,
  newBatchId: () => string = () => crypto.randomUUID(),
): Promise<void> {
  await insertActivityEvents(
    gotyMembershipEventRows(list, oldGameIds, newGameIds, newBatchId()),
    db,
  );
}

export async function emitListReveal(
  list: { id: string; profileId: string | null; listType: string },
  db: Db,
  newBatchId: () => string = () => crypto.randomUUID(),
): Promise<void> {
  if (list.listType !== "goty" || !list.profileId) return;
  await insertActivityEvents(
    [
      {
        profileId: list.profileId,
        kind: "list_reveal",
        batchId: newBatchId(),
        gameId: null,
        listId: list.id,
      },
    ],
    db,
  );
}
