import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@thegamies/db";
import { igdbWebhookEvents } from "@thegamies/db/schema";
import { applyWebhook } from "./webhook-apply";
import type {
  IgdbWebhookEnvelope,
  WebhookEntity,
  WebhookMethod,
} from "./webhook-routing";

export type WebhookEventStatus = "pending" | "processed" | "failed";

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

export async function listWebhookEvents(
  db: Db,
  options: {
    limit?: number;
    offset?: number;
    status?: WebhookEventStatus | "all";
  } = {},
): Promise<{ events: WebhookEventRow[]; total: number }> {
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const offset = Math.max(0, options.offset ?? 0);
  const status = options.status ?? "all";

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
    .orderBy(desc(igdbWebhookEvents.receivedAt))
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
  const receivedAt = new Date(envelope.receivedAt);
  const [inserted] = await db
    .insert(igdbWebhookEvents)
    .values({
      receivedAt: Number.isFinite(receivedAt.getTime())
        ? receivedAt
        : new Date(),
      entity: envelope.entity,
      method: envelope.method,
      igdbId: envelope.igdbId,
      status: "pending",
      payload: envelope.body,
      queueMessageId: queueMessageId ?? null,
    })
    .returning({ id: igdbWebhookEvents.id });

  const eventId = inserted!.id;

  if (envelope.ingressError || !envelope.entity || !envelope.method) {
    const error =
      envelope.ingressError ?? "Missing entity or method on webhook envelope";
    await db
      .update(igdbWebhookEvents)
      .set({
        status: "failed",
        error,
        processedAt: new Date(),
      })
      .where(eq(igdbWebhookEvents.id, eventId));
    return { eventId, status: "failed" };
  }

  try {
    await applyWebhook(
      db,
      envelope.entity,
      envelope.method,
      envelope.body,
    );
    await db
      .update(igdbWebhookEvents)
      .set({
        status: "processed",
        error: null,
        processedAt: new Date(),
      })
      .where(eq(igdbWebhookEvents.id, eventId));
    return { eventId, status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(igdbWebhookEvents)
      .set({
        status: "failed",
        error: message,
        processedAt: new Date(),
      })
      .where(eq(igdbWebhookEvents.id, eventId));
    return { eventId, status: "failed" };
  }
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
  if (row.status !== "failed") {
    throw new Error("Only failed webhook events can be reprocessed");
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
    await db
      .update(igdbWebhookEvents)
      .set({
        status: "processed",
        error: null,
        processedAt: new Date(),
      })
      .where(eq(igdbWebhookEvents.id, eventId));
    return { status: "processed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(igdbWebhookEvents)
      .set({
        status: "failed",
        error: message,
        processedAt: new Date(),
      })
      .where(eq(igdbWebhookEvents.id, eventId));
    return { status: "failed" };
  }
}
