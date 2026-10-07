import { describe, expect, it } from "vitest";
import type { IgdbWebhookEnvelope } from "./webhook-routing";
import {
  QUEUE_MESSAGE_MAX_BYTES,
  fitsInQueueMessage,
  webhookEnvelopeBytes,
} from "./webhook-queue-size";

function envelope(body: unknown): IgdbWebhookEnvelope {
  return {
    receivedAt: "2026-10-07T20:03:12.941Z",
    entity: "games",
    method: "update",
    igdbId: 874,
    headers: { endpoint: "Games", operation: "update" },
    body,
  };
}

describe("fitsInQueueMessage", () => {
  it("fits a heavily tagged real-world game", () => {
    const body = {
      id: 874,
      name: "Tom Clancy's Splinter Cell: Pandora Tomorrow",
      tags: Array.from({ length: 88 }, (_, i) => 536870913 + i),
      keywords: Array.from({ length: 75 }, (_, i) => 1000 + i),
      summary: "x".repeat(400),
      storyline: "x".repeat(400),
    };
    expect(fitsInQueueMessage(envelope(body))).toBe(true);
  });

  it("refuses an envelope near the queue limit", () => {
    const big = envelope({ id: 1, keywords: "x".repeat(QUEUE_MESSAGE_MAX_BYTES) });
    expect(webhookEnvelopeBytes(big)).toBeGreaterThan(QUEUE_MESSAGE_MAX_BYTES);
    expect(fitsInQueueMessage(big)).toBe(false);
  });

  it("keeps headroom below the hard limit", () => {
    const justUnder = envelope({ id: 1, pad: "x".repeat(QUEUE_MESSAGE_MAX_BYTES - 4096) });
    expect(webhookEnvelopeBytes(justUnder)).toBeLessThan(QUEUE_MESSAGE_MAX_BYTES);
    expect(fitsInQueueMessage(justUnder)).toBe(false);
  });

  it("counts multibyte characters as bytes", () => {
    const ascii = envelope({ name: "Okami" });
    const multibyte = envelope({ name: "Ōkami" });
    expect(webhookEnvelopeBytes(multibyte)).toBe(webhookEnvelopeBytes(ascii) + 1);
  });
});
