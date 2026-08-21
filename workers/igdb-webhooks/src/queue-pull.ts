export type PulledMessage = {
  id: string;
  leaseId: string;
  body: unknown;
  attempts: number;
};

type PullResponse = {
  success: boolean;
  errors?: Array<{ message: string }>;
  result?: {
    message_backlog_count?: number;
    messages?: Array<{
      id: string;
      lease_id: string;
      body: string | unknown;
      attempts?: number;
    }>;
  };
};

function parseBody(body: string | unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return { _raw: body };
  }
}

export async function pullQueueMessages(input: {
  accountId: string;
  queueId: string;
  apiToken: string;
  batchSize: number;
  visibilityTimeoutMs?: number;
}): Promise<PulledMessage[]> {
  const { accountId, queueId, apiToken, batchSize } = input;
  if (!accountId || !queueId || !apiToken) {
    throw new Error("Queue pull is not configured");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages/pull`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      batch_size: batchSize,
      visibility_timeout: input.visibilityTimeoutMs ?? 60_000,
    }),
  });

  const data = (await res.json()) as PullResponse;
  if (!res.ok || !data.success) {
    const message =
      data.errors?.map((e) => e.message).join("; ") ||
      `Queue pull failed: ${res.status}`;
    throw new Error(message);
  }

  return (data.result?.messages ?? []).map((msg) => ({
    id: msg.id,
    leaseId: msg.lease_id,
    body: parseBody(msg.body),
    attempts: msg.attempts ?? 0,
  }));
}

export async function ackQueueMessages(input: {
  accountId: string;
  queueId: string;
  apiToken: string;
  acks: string[];
  retries: string[];
}): Promise<void> {
  const { accountId, queueId, apiToken, acks, retries } = input;
  if (!acks.length && !retries.length) return;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}/messages/ack`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      acks: acks.map((lease_id) => ({ lease_id })),
      retries: retries.map((lease_id) => ({ lease_id })),
    }),
  });

  const data = (await res.json()) as PullResponse;
  if (!res.ok || !data.success) {
    const message =
      data.errors?.map((e) => e.message).join("; ") ||
      `Queue ack failed: ${res.status}`;
    throw new Error(message);
  }
}
