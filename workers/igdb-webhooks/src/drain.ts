import { createDb } from "@thegamies/db";
import {
  processWebhookEnvelope,
  shouldRunDrain,
  type IgdbWebhookEnvelope,
} from "@thegamies/igdb";
import { ackQueueMessages, pullQueueMessages } from "./queue-pull";
import { readDrainSettings, writeDrainSettings } from "./settings";

/** Safety cap so a huge backlog cannot exceed cron wall time in one invocation. */
const MAX_PULL_BATCHES_PER_INVOCATION = 200;

function isEnvelope(value: unknown): value is IgdbWebhookEnvelope {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.receivedAt === "string" && "body" in row;
}

export type DrainResult = {
  skipped: boolean;
  reason?: string;
  pulled: number;
  processed: number;
  failed: number;
  retried: number;
  batches: number;
  /** False if a safety cap stopped us with messages likely still queued. */
  emptied: boolean;
};

export async function runDrain(
  env: Env,
  options: { force?: boolean } = {},
): Promise<DrainResult> {
  const settings = await readDrainSettings(env.IGDB_WEBHOOK_SETTINGS);
  if (!options.force && !shouldRunDrain(settings)) {
    const reason = settings.paused
      ? "paused"
      : settings.processingMode === "live"
        ? "live"
        : "interval";
    return {
      skipped: true,
      reason,
      pulled: 0,
      processed: 0,
      failed: 0,
      retried: 0,
      batches: 0,
      emptied: true,
    };
  }

  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.IGDB_WEBHOOK_QUEUE_ID ||
    !env.CLOUDFLARE_API_TOKEN
  ) {
    await writeDrainSettings(env.IGDB_WEBHOOK_SETTINGS, {
      lastDrainAt: new Date().toISOString(),
    });
    return {
      skipped: true,
      reason: "queue_pull_unconfigured",
      pulled: 0,
      processed: 0,
      failed: 0,
      retried: 0,
      batches: 0,
      emptied: true,
    };
  }

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for drain");
  }

  const db = createDb(env.DATABASE_URL);
  let pulled = 0;
  let processed = 0;
  let failed = 0;
  let retried = 0;
  let batches = 0;
  let emptied = false;

  while (batches < MAX_PULL_BATCHES_PER_INVOCATION) {
    const messages = await pullQueueMessages({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      queueId: env.IGDB_WEBHOOK_QUEUE_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      batchSize: settings.maxMessagesPerDrain,
    });

    if (messages.length === 0) {
      emptied = true;
      break;
    }

    batches += 1;
    pulled += messages.length;

    const acks: string[] = [];
    const retries: string[] = [];

    for (const message of messages) {
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
        if (result.status === "processed") {
          processed += 1;
          acks.push(message.leaseId);
        } else if (envelope.ingressError) {
          failed += 1;
          acks.push(message.leaseId);
        } else if (message.attempts >= 5) {
          failed += 1;
          acks.push(message.leaseId);
        } else {
          failed += 1;
          retries.push(message.leaseId);
        }
      } catch {
        failed += 1;
        if (message.attempts >= 5) {
          acks.push(message.leaseId);
        } else {
          retries.push(message.leaseId);
        }
      }
    }

    retried += retries.length;

    await ackQueueMessages({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      queueId: env.IGDB_WEBHOOK_QUEUE_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      acks,
      retries,
    });

    // Short pull returned a partial batch — queue is drained for now.
    if (messages.length < settings.maxMessagesPerDrain) {
      emptied = true;
      break;
    }
  }

  // Only advance the cadence clock when the queue is clear. If we hit the
  // batch safety cap, the next cron minute continues without waiting.
  if (emptied) {
    await writeDrainSettings(env.IGDB_WEBHOOK_SETTINGS, {
      lastDrainAt: new Date().toISOString(),
    });
  }

  return {
    skipped: false,
    pulled,
    processed,
    failed,
    retried,
    batches,
    emptied,
  };
}
