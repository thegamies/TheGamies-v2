import {
  deleteIgdbWebhook,
  fetchWebhookRegistrationOverview,
  clampWebhookEventSort,
  listWebhookEvents,
  desiredQueueOpen,
  nextScheduledCloseAt,
  processWebhookEnvelope,
  registerIgdbWebhookSlot,
  registerMissingIgdbWebhooks,
  reprocessWebhookEvent,
  resolveWebhookRouting,
  testIgdbWebhook,
  tryExtractWebhookIgdbId,
  verifyIgdbWebhookSecret,
  WEBHOOK_ENTITIES,
  WEBHOOK_METHODS,
  type IgdbWebhookEnvelope,
  type WebhookEntity,
  type WebhookEventStatus,
  type WebhookMethod,
} from "@thegamies/igdb";
import { createDb } from "@thegamies/db";
import { bindProcessEnv, json, requireAdmin } from "./http";
import { setQueueDeliveryPaused } from "./queue-delivery";
import { readDrainSettings, writeDrainSettings } from "./settings";

function isEnvelope(value: unknown): value is IgdbWebhookEnvelope {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.receivedAt === "string" && "body" in row;
}

async function syncQueueDelivery(env: Env, now = new Date()): Promise<boolean> {
  const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
  const open = desiredQueueOpen(settings, now);
  await setQueueDeliveryPaused(env, !open);
  return open;
}

function callbackUrl(env: Env, request: Request): string {
  const configured = env.IGDB_WEBHOOK_PUBLIC_URL?.replace(/\/$/, "");
  if (configured) return `${configured}/igdb`;
  const url = new URL(request.url);
  return `${url.origin}/igdb`;
}

async function handleIgdbIngress(
  request: Request,
  env: Env,
): Promise<Response> {
  const secret = env.IGDB_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: "Webhook secret is not configured." }, 503);
  }

  const receivedSecret = request.headers.get("x-secret") ?? "";
  if (!verifyIgdbWebhookSecret(receivedSecret, secret)) {
    return json({ error: "Invalid secret." }, 401);
  }

  const rawBody = await request.text();
  let body: unknown;
  let parseError: string | undefined;
  try {
    body = rawBody ? (JSON.parse(rawBody) as unknown) : null;
  } catch {
    body = { _parse_error: true, _raw: rawBody.slice(0, 8_000) };
    parseError = "Invalid JSON body";
  }

  const endpointHeader = request.headers.get("x-endpoint");
  const operationHeader =
    request.headers.get("x-operation") ?? request.headers.get("x-method");

  let envelope: IgdbWebhookEnvelope;
  try {
    if (parseError) {
      throw new Error(parseError);
    }
    const routed = resolveWebhookRouting({
      receivedSecret,
      baseSecret: secret,
      endpointHeader,
      operationHeader,
      payload: body,
    });
    envelope = {
      receivedAt: new Date().toISOString(),
      entity: routed.entity,
      method: routed.method,
      igdbId: tryExtractWebhookIgdbId(body),
      headers: {
        endpoint: endpointHeader ?? undefined,
        operation: operationHeader ?? undefined,
      },
      body,
    };
  } catch (error) {
    envelope = {
      receivedAt: new Date().toISOString(),
      entity: null,
      method: null,
      igdbId: tryExtractWebhookIgdbId(body),
      headers: {
        endpoint: endpointHeader ?? undefined,
        operation: operationHeader ?? undefined,
      },
      body,
      ingressError: error instanceof Error ? error.message : String(error),
    };
  }

  const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
  const useLive =
    settings.processingMode === "live" && settings.deliveryMode !== "closed";

  if (useLive) {
    if (!env.DATABASE_URL) {
      // Fall back to queue so the delivery is not lost.
      await env.IGDB_WEBHOOK_QUEUE.send(envelope);
      return json({ ok: true, mode: "queued", reason: "database_unconfigured" });
    }
    bindProcessEnv(env);
    const db = createDb(env.DATABASE_URL);
    await processWebhookEnvelope(db, envelope);
    return json({ ok: true, mode: "live" });
  }

  await env.IGDB_WEBHOOK_QUEUE.send(envelope);
  return json({ ok: true, mode: "queued" });
}

async function handleAdminSettings(
  request: Request,
  env: Env,
): Promise<Response> {
  const denied = requireAdmin(request, env.ADMIN_SYNC_SECRET);
  if (denied) return denied;

  if (request.method === "GET") {
    const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
    return json({ settings });
  }

  if (request.method === "PUT") {
    const body = (await request.json()) as Record<string, unknown>;
    const settings = await writeDrainSettings(env.IGDB_WEBHOOK_SETTINGS, {
      processingMode:
        body.processingMode === "live" || body.processingMode === "queued"
          ? body.processingMode
          : undefined,
      intervalMinutes:
        typeof body.intervalMinutes === "number"
          ? body.intervalMinutes
          : undefined,
      windowMinutes:
        typeof body.windowMinutes === "number"
          ? body.windowMinutes
          : undefined,
      maxMessagesPerDrain:
        typeof body.maxMessagesPerDrain === "number"
          ? body.maxMessagesPerDrain
          : undefined,
      deliveryMode:
        body.deliveryMode === "auto" ||
        body.deliveryMode === "open" ||
        body.deliveryMode === "closed"
          ? body.deliveryMode
          : undefined,
      paused: typeof body.paused === "boolean" ? body.paused : undefined,
      forceOpenUntil: body.deliveryMode === "closed" ? null : undefined,
    });
    try {
      await setQueueDeliveryPaused(env, !desiredQueueOpen(settings));
    } catch (error) {
      console.error(
        "igdb-webhooks-delivery-sync",
        error instanceof Error ? error.message : String(error),
      );
    }
    return json({ settings });
  }

  return json({ error: "Method not allowed." }, 405);
}

async function handleAdminEvents(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const denied = requireAdmin(request, env.ADMIN_SYNC_SECRET);
  if (denied) return denied;
  bindProcessEnv(env);

  const parts = url.pathname.split("/").filter(Boolean);
  // /admin/events/:id/reprocess
  if (
    parts.length === 4 &&
    parts[0] === "admin" &&
    parts[1] === "events" &&
    parts[3] === "reprocess" &&
    request.method === "POST"
  ) {
    const db = createDb(env.DATABASE_URL);
    const result = await reprocessWebhookEvent(db, parts[2]!);
    return json(result);
  }

  if (parts.length === 2 && request.method === "GET") {
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const offset = Number(url.searchParams.get("offset") ?? "0");
    const statusParam = url.searchParams.get("status") ?? "all";
    const status =
      statusParam === "pending" ||
      statusParam === "processed" ||
      statusParam === "failed" ||
      statusParam === "all"
        ? (statusParam as WebhookEventStatus | "all")
        : "all";
    const sort = clampWebhookEventSort(url.searchParams.get("sort"));
    const db = createDb(env.DATABASE_URL);
    const result = await listWebhookEvents(db, { limit, offset, status, sort });
    return json(result);
  }

  return json({ error: "Not found." }, 404);
}

async function handleAdminRegister(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const denied = requireAdmin(request, env.ADMIN_SYNC_SECRET);
  if (denied) return denied;
  bindProcessEnv(env);

  const parts = url.pathname.split("/").filter(Boolean);
  const cb = callbackUrl(env, request);
  const baseSecret = env.IGDB_WEBHOOK_SECRET;
  if (!baseSecret) {
    return json({ error: "Webhook secret is not configured." }, 503);
  }

  // GET /admin/register
  if (parts.length === 2 && request.method === "GET") {
    const overview = await fetchWebhookRegistrationOverview(baseSecret, cb);
    return json(overview);
  }

  // POST /admin/register/all
  if (
    parts.length === 3 &&
    parts[2] === "all" &&
    request.method === "POST"
  ) {
    const result = await registerMissingIgdbWebhooks(cb, baseSecret);
    return json(result);
  }

  // POST /admin/register  { entity, method }
  if (parts.length === 2 && request.method === "POST") {
    const body = (await request.json()) as {
      entity?: string;
      method?: string;
    };
    if (
      !body.entity ||
      !WEBHOOK_ENTITIES.has(body.entity as WebhookEntity) ||
      !body.method ||
      !WEBHOOK_METHODS.has(body.method as WebhookMethod)
    ) {
      return json({ error: "Invalid entity or method." }, 400);
    }
    const registration = await registerIgdbWebhookSlot(
      body.entity as WebhookEntity,
      body.method as WebhookMethod,
      cb,
      baseSecret,
    );
    return json({ registration });
  }

  // DELETE /admin/register/:webhookId
  if (parts.length === 3 && request.method === "DELETE") {
    const webhookId = Number(parts[2]);
    if (!Number.isFinite(webhookId)) {
      return json({ error: "Invalid webhook id." }, 400);
    }
    const registration = await deleteIgdbWebhook(webhookId);
    return json({ registration });
  }

  // POST /admin/register/test  { entity, webhookId, entityId }
  if (
    parts.length === 3 &&
    parts[2] === "test" &&
    request.method === "POST"
  ) {
    const body = (await request.json()) as {
      entity?: string;
      webhookId?: number;
      entityId?: number;
    };
    if (
      !body.entity ||
      !WEBHOOK_ENTITIES.has(body.entity as WebhookEntity) ||
      typeof body.webhookId !== "number" ||
      typeof body.entityId !== "number"
    ) {
      return json({ error: "Invalid test payload." }, 400);
    }
    const result = await testIgdbWebhook(
      body.entity as WebhookEntity,
      body.webhookId,
      body.entityId,
    );
    return json({ result });
  }

  return json({ error: "Not found." }, 404);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (path === "/igdb" && request.method === "POST") {
        return await handleIgdbIngress(request, env);
      }

      if (path === "/internal/drain" && request.method === "POST") {
        const denied = requireAdmin(request, env.ADMIN_SYNC_SECRET);
        if (denied) return denied;
        const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
        if (settings.deliveryMode === "closed") {
          return json(
            { skipped: true, reason: "closed" },
            409,
          );
        }
        const forceOpenUntil =
          settings.deliveryMode === "auto"
            ? nextScheduledCloseAt(settings).toISOString()
            : null;
        await writeDrainSettings(env.IGDB_WEBHOOK_SETTINGS, {
          forceOpenUntil,
          lastDrainAt: new Date().toISOString(),
        });
        await setQueueDeliveryPaused(env, false);
        return json({
          accepted: true,
          open: true,
          deliveryMode: settings.deliveryMode,
          forceOpenUntil,
        });
      }

      if (path === "/admin/settings") {
        return await handleAdminSettings(request, env);
      }

      if (path.startsWith("/admin/events")) {
        return await handleAdminEvents(request, env, url);
      }

      if (path.startsWith("/admin/register")) {
        return await handleAdminRegister(request, env, url);
      }

      if (path === "/health") {
        return json({ ok: true });
      }

      return json({ error: "Not found." }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("igdb-webhooks-error", message);
      return json({ error: message }, 500);
    }
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext,
  ): Promise<void> {
    try {
      const open = await syncQueueDelivery(env);
      console.log(
        JSON.stringify({ msg: "igdb-webhooks", event: "delivery-sync", open }),
      );
    } catch (error) {
      console.error(
        "igdb-webhooks-cron-error",
        error instanceof Error ? error.message : String(error),
      );
    }
  },

  async queue(
    batch: MessageBatch<unknown>,
    env: Env,
  ): Promise<void> {
    const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
    if (settings.deliveryMode === "closed") {
      for (const message of batch.messages) {
        message.retry();
      }
      return;
    }
    if (!env.DATABASE_URL) {
      for (const message of batch.messages) {
        message.retry();
      }
      return;
    }
    bindProcessEnv(env);
    const db = createDb(env.DATABASE_URL);
    for (const message of batch.messages) {
      try {
        const envelope: IgdbWebhookEnvelope = isEnvelope(message.body)
          ? message.body
          : {
              receivedAt: new Date().toISOString(),
              entity: null,
              method: null,
              igdbId: null,
              headers: {},
              body: message.body,
              ingressError: "Queue message was not a webhook envelope",
            };
        const result = await processWebhookEnvelope(db, envelope, message.id);
        if (result.status === "failed" && !envelope.ingressError) {
          message.retry();
        } else {
          message.ack();
        }
      } catch {
        message.retry();
      }
    }
  },
};
