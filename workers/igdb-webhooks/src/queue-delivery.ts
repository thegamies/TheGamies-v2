import { parseQueueProducerMetrics } from "@thegamies/igdb";

type QueueApiEnv = Pick<
  Env,
  "CLOUDFLARE_ACCOUNT_ID" | "IGDB_WEBHOOK_QUEUE_ID" | "CLOUDFLARE_API_TOKEN"
>;

function queueApiUrl(env: QueueApiEnv, suffix = ""): string | null {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const queueId = env.IGDB_WEBHOOK_QUEUE_ID;
  if (!accountId || !queueId) return null;
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}${suffix}`;
}

function queueApiHeaders(env: QueueApiEnv): HeadersInit | null {
  if (!env.CLOUDFLARE_API_TOKEN) return null;
  return {
    Authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/** Pause or resume Cloudflare Queue delivery (not a Worker deploy). */
export async function setQueueDeliveryPaused(
  env: QueueApiEnv,
  paused: boolean,
): Promise<void> {
  const url = queueApiUrl(env);
  const headers = queueApiHeaders(env);
  if (!url || !headers) {
    throw new Error("Queue delivery control is not configured.");
  }

  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      settings: { delivery_paused: paused },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Queue delivery ${paused ? "pause" : "resume"} failed: ${text.slice(0, 240)}`,
    );
  }
}

type QueueWithMetrics = {
  metrics?: () => Promise<unknown>;
};

async function readQueueBacklogFromRest(env: QueueApiEnv): Promise<number | null> {
  const url = queueApiUrl(env, "/metrics");
  const headers = queueApiHeaders(env);
  if (!url || !headers) return null;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    return parseQueueProducerMetrics(await res.json());
  } catch {
    return null;
  }
}

export async function readQueueBacklogCount(
  queue: QueueWithMetrics | undefined,
  env?: QueueApiEnv,
): Promise<number | null> {
  // REST matches the dashboard count. Prefer it for the Auto pause gate.
  if (env) {
    const rest = await readQueueBacklogFromRest(env);
    if (rest !== null) return rest;
  }
  if (typeof queue?.metrics === "function") {
    try {
      return parseQueueProducerMetrics(await queue.metrics());
    } catch {
      return null;
    }
  }
  return null;
}
