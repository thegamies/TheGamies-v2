import type { IgdbWebhookEnvelope } from "./webhook-routing";

/** Cloudflare Queues rejects messages over 128 KB. */
export const QUEUE_MESSAGE_MAX_BYTES = 128 * 1024;

// Queues measures its own serialization, not JSON; leave headroom.
const QUEUE_SAFE_BYTES = QUEUE_MESSAGE_MAX_BYTES - 16 * 1024;

export function webhookEnvelopeBytes(envelope: IgdbWebhookEnvelope): number {
  return new TextEncoder().encode(JSON.stringify(envelope)).byteLength;
}

export function fitsInQueueMessage(envelope: IgdbWebhookEnvelope): boolean {
  return webhookEnvelopeBytes(envelope) <= QUEUE_SAFE_BYTES;
}
