/** Pause or resume Cloudflare Queue delivery (not a Worker deploy). */
export async function setQueueDeliveryPaused(
  env: Pick<
    Env,
    "CLOUDFLARE_ACCOUNT_ID" | "IGDB_WEBHOOK_QUEUE_ID" | "CLOUDFLARE_API_TOKEN"
  >,
  paused: boolean,
): Promise<void> {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const queueId = env.IGDB_WEBHOOK_QUEUE_ID;
  const token = env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !queueId || !token) {
    throw new Error("Queue delivery control is not configured.");
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/queues/${queueId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        settings: { delivery_paused: paused },
      }),
    },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Queue delivery ${paused ? "pause" : "resume"} failed: ${text.slice(0, 240)}`,
    );
  }
}
