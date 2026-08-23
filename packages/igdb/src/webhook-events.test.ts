import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@thegamies/db";
import type { IgdbWebhookEnvelope } from "./webhook-routing";

vi.mock("./webhook-apply", () => ({
  applyWebhook: vi.fn(),
}));

import { applyWebhook } from "./webhook-apply";
import {
  clampWebhookEventSort,
  formatDbError,
  processWebhookEnvelope,
  reprocessWebhookEvent,
} from "./webhook-events";

const apply = vi.mocked(applyWebhook);

type UpdatePatch = {
  status?: string;
  error?: string | null;
};

function createMockDb(options: {
  existingId?: string;
  failProcessedWrites?: number;
}) {
  const inserts: unknown[] = [];
  const updates: UpdatePatch[] = [];
  let processedFailsLeft = options.failProcessedWrites ?? 0;

  const db = {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () =>
            options.existingId ? [{ id: options.existingId }] : [],
        }),
      }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserts.push(values);
        return {
          returning: async () => [{ id: "evt-new" }],
        };
      },
    }),
    update: () => ({
      set: (patch: UpdatePatch) => ({
        where: async () => {
          if (patch.status === "processed" && processedFailsLeft > 0) {
            processedFailsLeft -= 1;
            throw new Error("Failed query: update igdb_webhook_events");
          }
          updates.push(patch);
        },
      }),
    }),
  };

  return { db: db as unknown as Db, inserts, updates };
}

const envelope: IgdbWebhookEnvelope = {
  receivedAt: "2026-08-21T12:00:00.000Z",
  entity: "games",
  method: "update",
  igdbId: 1,
  headers: {},
  body: { id: 1, name: "Test" },
};

describe("clampWebhookEventSort", () => {
  it("defaults to receivedAt and accepts processedAt", () => {
    expect(clampWebhookEventSort("processedAt")).toBe("processedAt");
    expect(clampWebhookEventSort("receivedAt")).toBe("receivedAt");
    expect(clampWebhookEventSort("nope")).toBe("receivedAt");
    expect(clampWebhookEventSort(null)).toBe("receivedAt");
  });
});

describe("formatDbError", () => {
  it("includes code, detail, and cause", () => {
    const cause = new Error("Too many subrequests");
    const error = new Error("Failed query: select id from games");
    Object.assign(error, { code: "XX000", detail: "fetch failed", cause });
    expect(formatDbError(error)).toContain("Too many subrequests");
    expect(formatDbError(error)).toContain("XX000");
    expect(formatDbError(error)).toContain("Failed query");
  });

  it("stringifies non-error values", () => {
    expect(formatDbError("boom")).toBe("boom");
  });
});

describe("processWebhookEnvelope", () => {
  beforeEach(() => {
    apply.mockReset();
    apply.mockResolvedValue(undefined);
  });

  it("reuses the event row for the same queue message id", async () => {
    const { db, inserts, updates } = createMockDb({ existingId: "evt-1" });
    const result = await processWebhookEnvelope(db, envelope, "queue-1");
    expect(result).toEqual({ eventId: "evt-1", status: "processed" });
    expect(inserts).toHaveLength(0);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(updates.at(-1)?.status).toBe("processed");
  });

  it("returns processed when apply succeeds even if status write fails", async () => {
    const { db, updates } = createMockDb({ failProcessedWrites: 2 });
    const result = await processWebhookEnvelope(db, envelope, "queue-2");
    expect(result.status).toBe("processed");
    expect(updates.some((u) => u.status === "failed")).toBe(false);
  });

  it("stores the formatted apply error as failed", async () => {
    apply.mockRejectedValueOnce(
      new Error("Failed query: delete from game_themes"),
    );
    const { db, updates } = createMockDb({});
    const result = await processWebhookEnvelope(db, envelope);
    expect(result.status).toBe("failed");
    expect(updates.at(-1)?.error).toContain("delete from game_themes");
  });
});

describe("reprocessWebhookEvent", () => {
  beforeEach(() => {
    apply.mockReset();
    apply.mockResolvedValue(undefined);
  });

  it("allows pending events", async () => {
    const db = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: "evt-p",
                status: "pending",
                entity: "games",
                method: "update",
                payload: { id: 1 },
              },
            ],
          }),
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => undefined,
        }),
      }),
    } as unknown as Db;

    await expect(reprocessWebhookEvent(db, "evt-p")).resolves.toEqual({
      status: "processed",
    });
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
