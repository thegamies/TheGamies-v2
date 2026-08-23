import { and, desc, eq, sql } from "drizzle-orm";
import {
  igdbWebhookEvents,
  type Db,
} from "@thegamies/db";
import { applyWebhook } from "./webhook-apply";
import type {
  IgdbWebhookEnvelope,
  WebhookEntity,
  WebhookMethod,
} from "./webhook-routing";

export type WebhookEventStatus = "pending" | "processed" | "failed";
export type WebhookEventSort = "receivedAt" | "processedAt";

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
  const receivedAt = new Date(envelope.receivedAt);
  const received = Number.isFinite(receivedAt.getTime())
    ? receivedAt
    : new Date();
  const values = {
    receivedAt: received,
    entity: envelope.entity,
    method: envelope.method,
    igdbId: envelope.igdbId,
    status: "pending" as const,
    error: null,
    payload: envelope.body,
    queueMessageId: queueMessageId ?? null,
  };

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
