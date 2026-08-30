import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  igdbWebhookEvents,
  type Db,
} from "@thegamies/db";
import { applyGameCreateUpdates, applyWebhook } from "./webhook-apply";
import type {
  IgdbWebhookEnvelope,
  WebhookEntity,
  WebhookMethod,
} from "./webhook-routing";

export type WebhookEventStatus = "pending" | "processed" | "failed";
export type WebhookEventSort = "receivedAt" | "processedAt";

export type WebhookBatchItem = {
  envelope: IgdbWebhookEnvelope;
  queueMessageId?: string | null;
};

export type WebhookBatchItemResult = {
  eventId: string;
  status: WebhookEventStatus;
};

export type GameOpCollapse = {
  writes: { applyIndex: number; eventIndexes: number[] }[];
  deletes: { applyIndex: number; eventIndexes: number[] }[];
};

/** Last create/update/delete per game igdb id; earlier envelopes share that result. */
export function collapseGameOpsByIgdbId(
  envelopes: IgdbWebhookEnvelope[],
): GameOpCollapse {
  const byId = new Map<number, number[]>();
  envelopes.forEach((envelope, index) => {
    if (envelope.entity !== "games") return;
    if (
      envelope.method !== "create" &&
      envelope.method !== "update" &&
      envelope.method !== "delete"
    ) {
      return;
    }
    if (envelope.igdbId == null) return;
    const list = byId.get(envelope.igdbId) ?? [];
    list.push(index);
    byId.set(envelope.igdbId, list);
  });

  const writes: GameOpCollapse["writes"] = [];
  const deletes: GameOpCollapse["deletes"] = [];
  for (const indexes of byId.values()) {
    const applyIndex = indexes[indexes.length - 1]!;
    const method = envelopes[applyIndex]?.method;
    const group = { applyIndex, eventIndexes: indexes };
    if (method === "delete") deletes.push(group);
    else writes.push(group);
  }
  return { writes, deletes };
}

export function clampWebhookEventSort(value: unknown): WebhookEventSort {
  return value === "processedAt" ? "processedAt" : "receivedAt";
}

export type WebhookEventRow = {
  id: string;
  receivedAt: Date;
  processedAt: Date | null;
  entity: string | null;
  method: string | null;
  igdbId: number | null;
  status: string;
  error: string | null;
  payload: unknown;
  queueMessageId: string | null;
  createdAt: Date;
};

function errorProperty(value: unknown, key: string): string | null {
  if (!value || typeof value !== "object") return null;
  const raw = (value as Record<string, unknown>)[key];
  if (typeof raw === "string" && raw.trim()) return raw;
  if (typeof raw === "number") return String(raw);
  return null;
}

/** Neon HTTP / Worker fetch failures hide the cause on `.cause` / `.code`. */
export function formatDbError(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current != null && !seen.has(current)) {
    seen.add(current);
    const code = errorProperty(current, "code");
    const detail = errorProperty(current, "detail");
    if (code && !parts.includes(code)) parts.push(code);
    if (detail && !parts.includes(detail)) parts.push(detail);

    if (current instanceof Error) {
      if (current.message && !parts.includes(current.message)) {
        parts.push(current.message);
      }
      current = current.cause;
      continue;
    }

    const message = errorProperty(current, "message");
    if (message && !parts.includes(message)) parts.push(message);
    const nested =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : undefined;
    if (nested === undefined) break;
    current = nested;
  }

  if (parts.length === 0) return String(error);
  return parts.join(" — ");
}

async function markEvent(
  db: Db,
  eventId: string,
  patch: {
    status: WebhookEventStatus;
    error: string | null;
    processedAt: Date;
    payload?: null;
  },
): Promise<void> {
  await db
    .update(igdbWebhookEvents)
    .set(patch)
    .where(eq(igdbWebhookEvents.id, eventId));
}

async function markProcessed(db: Db, eventId: string): Promise<void> {
  const patch = {
    status: "processed" as const,
    error: null,
    payload: null,
    processedAt: new Date(),
  };
  try {
    await markEvent(db, eventId, patch);
  } catch {
    try {
      await markEvent(db, eventId, patch);
    } catch {
      // Catalog apply already succeeded; leave the event row if this write dies.
    }
  }
}

async function markFailed(
  db: Db,
  eventId: string,
  error: unknown,
): Promise<void> {
  await markEvent(db, eventId, {
    status: "failed",
    error: formatDbError(error),
    processedAt: new Date(),
  });
}

async function upsertEventRow(
  db: Db,
  envelope: IgdbWebhookEnvelope,
  queueMessageId?: string | null,
): Promise<string> {
  const values = eventRowValues(envelope, queueMessageId);

  if (queueMessageId) {
    const [existing] = await db
      .select({ id: igdbWebhookEvents.id })
      .from(igdbWebhookEvents)
      .where(eq(igdbWebhookEvents.queueMessageId, queueMessageId))
      .limit(1);
    if (existing) {
      await db
        .update(igdbWebhookEvents)
        .set(values)
        .where(eq(igdbWebhookEvents.id, existing.id));
      return existing.id;
    }
  }

  const [inserted] = await db
    .insert(igdbWebhookEvents)
    .values(values)
    .returning({ id: igdbWebhookEvents.id });
  return inserted!.id;
}

function eventRowValues(
  envelope: IgdbWebhookEnvelope,
  queueMessageId?: string | null,
) {
  const receivedAt = new Date(envelope.receivedAt);
  const received = Number.isFinite(receivedAt.getTime())
    ? receivedAt
    : new Date();
  return {
    receivedAt: received,
    entity: envelope.entity,
    method: envelope.method,
    igdbId: envelope.igdbId,
    status: "pending" as const,
    error: null,
    payload: envelope.body,
    queueMessageId: queueMessageId ?? null,
  };
}

async function markProcessedMany(db: Db, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const patch = {
    status: "processed" as const,
    error: null,
    payload: null,
    processedAt: new Date(),
  };
  try {
    await db
      .update(igdbWebhookEvents)
      .set(patch)
      .where(inArray(igdbWebhookEvents.id, eventIds));
  } catch {
    try {
      await db
        .update(igdbWebhookEvents)
        .set(patch)
        .where(inArray(igdbWebhookEvents.id, eventIds));
    } catch {
      // Catalog apply already succeeded; leave the event rows if this write dies.
    }
  }
}

async function markFailedMany(
  db: Db,
  eventIds: string[],
  error: unknown,
): Promise<void> {
  if (eventIds.length === 0) return;
  await db
    .update(igdbWebhookEvents)
    .set({
      status: "failed",
      error: formatDbError(error),
      processedAt: new Date(),
    })
    .where(inArray(igdbWebhookEvents.id, eventIds));
}

async function insertEventRowsForBatch(
  db: Db,
  items: WebhookBatchItem[],
): Promise<string[]> {
  const eventIds: (string | null)[] = items.map(() => null);
  const queued = items
    .map((item, index) => ({
      index,
      queueMessageId: item.queueMessageId ?? null,
    }))
    .filter((row) => row.queueMessageId);

  if (queued.length > 0) {
    const existing = await db
      .select({
        id: igdbWebhookEvents.id,
        queueMessageId: igdbWebhookEvents.queueMessageId,
      })
      .from(igdbWebhookEvents)
      .where(
        inArray(
          igdbWebhookEvents.queueMessageId,
          queued.map((row) => row.queueMessageId!),
        ),
      );
    const idByQueue = new Map<string, string>();
    for (const row of existing) {
      if (row.queueMessageId) idByQueue.set(row.queueMessageId, row.id);
    }
    for (const row of queued) {
      const existingId = idByQueue.get(row.queueMessageId!);
      if (!existingId) continue;
      await db
        .update(igdbWebhookEvents)
        .set(eventRowValues(items[row.index]!.envelope, row.queueMessageId))
        .where(eq(igdbWebhookEvents.id, existingId));
      eventIds[row.index] = existingId;
    }
  }

  const toInsert = items
    .map((item, index) => ({ item, index }))
    .filter((row) => eventIds[row.index] == null);
  if (toInsert.length > 0) {
    const inserted = await db
      .insert(igdbWebhookEvents)
      .values(
        toInsert.map((row) =>
          eventRowValues(row.item.envelope, row.item.queueMessageId),
        ),
      )
      .returning({ id: igdbWebhookEvents.id });
    toInsert.forEach((row, offset) => {
      eventIds[row.index] = inserted[offset]!.id;
    });
  }

  return eventIds as string[];
}

export async function listWebhookEvents(
  db: Db,
  options: {
    limit?: number;
    offset?: number;
    status?: WebhookEventStatus | "all";
    sort?: WebhookEventSort | string | null;
  } = {},
): Promise<{ events: WebhookEventRow[]; total: number }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = Math.max(0, options.offset ?? 0);
  const status = options.status ?? "all";
  const sort = clampWebhookEventSort(options.sort);
  const orderBy =
    sort === "processedAt"
      ? sql`${igdbWebhookEvents.processedAt} DESC NULLS LAST`
      : desc(igdbWebhookEvents.receivedAt);

  const where =
    status === "all" ? undefined : eq(igdbWebhookEvents.status, status);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(igdbWebhookEvents)
    .where(where);

  const events = await db
    .select()
    .from(igdbWebhookEvents)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  return {
    events: events as WebhookEventRow[],
    total: countRow?.count ?? 0,
  };
}

export async function processWebhookEnvelope(
  db: Db,
  envelope: IgdbWebhookEnvelope,
  queueMessageId?: string | null,
): Promise<{ eventId: string; status: WebhookEventStatus }> {
  const eventId = await upsertEventRow(db, envelope, queueMessageId);

  if (envelope.ingressError || !envelope.entity || !envelope.method) {
    const error =
      envelope.ingressError ?? "Missing entity or method on webhook envelope";
    await markFailed(db, eventId, error);
    return { eventId, status: "failed" };
  }

  try {
    await applyWebhook(
      db,
      envelope.entity,
      envelope.method,
      envelope.body,
    );
  } catch (error) {
    await markFailed(db, eventId, error);
    return { eventId, status: "failed" };
  }

  await markProcessed(db, eventId);
  return { eventId, status: "processed" };
}

export async function processWebhookBatch(
  db: Db,
  items: WebhookBatchItem[],
): Promise<WebhookBatchItemResult[]> {
  if (items.length === 0) return [];

  const eventIds = await insertEventRowsForBatch(db, items);
  const envelopes = items.map((item) => item.envelope);
  const results: WebhookBatchItemResult[] = eventIds.map((eventId) => ({
    eventId,
    status: "pending",
  }));
  const assigned = new Set<number>();

  const assign = (
    indexes: number[],
    status: WebhookEventStatus,
  ): string[] => {
    const ids: string[] = [];
    for (const index of indexes) {
      assigned.add(index);
      results[index] = { eventId: eventIds[index]!, status };
      ids.push(eventIds[index]!);
    }
    return ids;
  };

  for (let index = 0; index < items.length; index += 1) {
    const envelope = envelopes[index]!;
    if (envelope.ingressError || !envelope.entity || !envelope.method) {
      const error =
        envelope.ingressError ?? "Missing entity or method on webhook envelope";
      const ids = assign([index], "failed");
      await markFailedMany(db, ids, error);
    }
  }

  const collapse = collapseGameOpsByIgdbId(
    envelopes.map((envelope, index) =>
      assigned.has(index)
        ? { ...envelope, entity: null, igdbId: null }
        : envelope,
    ),
  );

  const writeGroups = collapse.writes.filter(
    (group) => !assigned.has(group.applyIndex),
  );
  if (writeGroups.length > 0) {
    const payloads = writeGroups.map(
      (group) => envelopes[group.applyIndex]!.body,
    );
    try {
      await applyGameCreateUpdates(db, payloads);
      const ids = assign(
        writeGroups.flatMap((group) => group.eventIndexes),
        "processed",
      );
      await markProcessedMany(db, ids);
    } catch {
      for (const group of writeGroups) {
        const envelope = envelopes[group.applyIndex]!;
        try {
          await applyWebhook(
            db,
            "games",
            envelope.method as WebhookMethod,
            envelope.body,
          );
          await markProcessedMany(
            db,
            assign(group.eventIndexes, "processed"),
          );
        } catch (error) {
          await markFailedMany(db, assign(group.eventIndexes, "failed"), error);
        }
      }
    }
  }

  const deleteGroupByIndex = new Map<
    number,
    GameOpCollapse["deletes"][number]
  >();
  for (const group of collapse.deletes) {
    if (assigned.has(group.applyIndex)) continue;
    for (const eventIndex of group.eventIndexes) {
      deleteGroupByIndex.set(eventIndex, group);
    }
  }

  for (let index = 0; index < items.length; index += 1) {
    if (assigned.has(index)) continue;

    const deleteGroup = deleteGroupByIndex.get(index);
    if (deleteGroup) {
      if (deleteGroup.applyIndex !== index) continue;
      const envelope = envelopes[index]!;
      try {
        await applyWebhook(db, "games", "delete", envelope.body);
        await markProcessedMany(
          db,
          assign(deleteGroup.eventIndexes, "processed"),
        );
      } catch (error) {
        await markFailedMany(
          db,
          assign(deleteGroup.eventIndexes, "failed"),
          error,
        );
      }
      continue;
    }

    const envelope = envelopes[index]!;
    if (!envelope.entity || !envelope.method) {
      await markFailedMany(
        db,
        assign([index], "failed"),
        "Missing entity or method on webhook envelope",
      );
      continue;
    }
    try {
      await applyWebhook(db, envelope.entity, envelope.method, envelope.body);
      await markProcessedMany(db, assign([index], "processed"));
    } catch (error) {
      await markFailedMany(db, assign([index], "failed"), error);
    }
  }

  return results;
}

export async function reprocessWebhookEvent(
  db: Db,
  eventId: string,
): Promise<{ status: WebhookEventStatus }> {
  const [row] = await db
    .select()
    .from(igdbWebhookEvents)
    .where(eq(igdbWebhookEvents.id, eventId))
    .limit(1);

  if (!row) {
    throw new Error("Webhook event not found");
  }
  if (row.status !== "failed" && row.status !== "pending") {
    throw new Error("Only failed or pending webhook events can be reprocessed");
  }
  if (!row.entity || !row.method) {
    throw new Error("Webhook event is missing entity or method");
  }

  await db
    .update(igdbWebhookEvents)
    .set({ status: "pending", error: null })
    .where(and(eq(igdbWebhookEvents.id, eventId)));

  try {
    await applyWebhook(
      db,
      row.entity as WebhookEntity,
      row.method as WebhookMethod,
      row.payload,
    );
  } catch (error) {
    await markFailed(db, eventId, error);
    return { status: "failed" };
  }

  await markProcessed(db, eventId);
  return { status: "processed" };
}

/**
 * Empty `igdb_webhook_events`. Faster and cheaper on Neon than batched DELETE.
 */
export async function truncateWebhookEvents(db: Db): Promise<void> {
  await db.execute(sql`truncate table igdb_webhook_events`);
}
