import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@thegamies/db";
import type { IgdbWebhookEnvelope } from "./webhook-routing";

vi.mock("./webhook-apply", () => ({
  applyWebhook: vi.fn(),
  applyGameCreateUpdates: vi.fn(),
}));

import { applyGameCreateUpdates, applyWebhook } from "./webhook-apply";
import {
  clampWebhookEventSort,
  collapseGameOpsByIgdbId,
  formatDbError,
  processWebhookBatch,
  processWebhookEnvelope,
  reprocessWebhookEvent,
} from "./webhook-events";

const apply = vi.mocked(applyWebhook);
const applyGames = vi.mocked(applyGameCreateUpdates);

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
        where: () => {
          const rows = options.existingId
            ? [{ id: options.existingId, queueMessageId: "queue-1" }]
            : [];
          return Object.assign(Promise.resolve(rows), {
            limit: async () =>
              options.existingId ? [{ id: options.existingId }] : [],
          });
        },
      }),
    }),
    insert: () => ({
      values: (values: unknown) => {
        inserts.push(values);
        return {
          returning: async () => {
            if (Array.isArray(values)) {
              return values.map((_, index) => ({ id: `evt-new-${index}` }));
            }
            return [{ id: "evt-new" }];
          },
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

describe("collapseGameOpsByIgdbId", () => {
  const game = (
    method: IgdbWebhookEnvelope["method"],
    igdbId: number,
  ): IgdbWebhookEnvelope => ({
    receivedAt: "2026-08-29T12:00:00.000Z",
    entity: "games",
    method,
    igdbId,
    headers: {},
    body: { id: igdbId },
  });

  it("keeps the last write per game and treats a later delete as the op", () => {
    const collapsed = collapseGameOpsByIgdbId([
      game("update", 1),
      game("update", 2),
      game("update", 1),
      game("delete", 2),
    ]);
    expect(collapsed.writes).toEqual([
      { applyIndex: 2, eventIndexes: [0, 2] },
    ]);
    expect(collapsed.deletes).toEqual([
      { applyIndex: 3, eventIndexes: [1, 3] },
    ]);
  });
});

describe("processWebhookEnvelope", () => {
  beforeEach(() => {
    apply.mockReset();
    apply.mockResolvedValue(undefined);
    applyGames.mockReset();
    applyGames.mockResolvedValue(undefined);
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

describe("processWebhookBatch", () => {
  beforeEach(() => {
    apply.mockReset();
    apply.mockResolvedValue(undefined);
    applyGames.mockReset();
    applyGames.mockResolvedValue(undefined);
  });

  const gameEnvelope = (
    igdbId: number,
    name: string,
  ): IgdbWebhookEnvelope => ({
    receivedAt: "2026-08-29T12:00:00.000Z",
    entity: "games",
    method: "update",
    igdbId,
    headers: {},
    body: { id: igdbId, name },
  });

  it("upserts distinct game writes in one catalog call", async () => {
    const { db, inserts } = createMockDb({});
    const results = await processWebhookBatch(db, [
      { envelope: gameEnvelope(1, "One"), queueMessageId: "q1" },
      { envelope: gameEnvelope(2, "Two"), queueMessageId: "q2" },
      {
        envelope: {
          receivedAt: "2026-08-29T12:00:00.000Z",
          entity: "covers",
          method: "update",
          igdbId: 9,
          headers: {},
          body: { id: 9 },
        },
        queueMessageId: "q3",
      },
    ]);
    expect(results.map((row) => row.status)).toEqual([
      "processed",
      "processed",
      "processed",
    ]);
    expect(applyGames).toHaveBeenCalledTimes(1);
    expect(applyGames.mock.calls[0]?.[1]).toEqual([
      { id: 1, name: "One" },
      { id: 2, name: "Two" },
    ]);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith(
      db,
      "covers",
      "update",
      { id: 9 },
    );
    expect(Array.isArray(inserts[0])).toBe(true);
    expect((inserts[0] as unknown[]).length).toBe(3);
  });

  it("applies only the last write when the same game repeats", async () => {
    const { db } = createMockDb({});
    await processWebhookBatch(db, [
      { envelope: gameEnvelope(1, "Old") },
      { envelope: gameEnvelope(1, "New") },
    ]);
    expect(applyGames).toHaveBeenCalledTimes(1);
    expect(applyGames.mock.calls[0]?.[1]).toEqual([{ id: 1, name: "New" }]);
    expect(apply).not.toHaveBeenCalled();
  });

  it("falls back to per-game apply when the batch upsert fails", async () => {
    applyGames.mockRejectedValueOnce(new Error("batch upsert failed"));
    apply.mockResolvedValueOnce(undefined);
    apply.mockRejectedValueOnce(new Error("Failed query: delete from game_themes"));
    const { db, updates } = createMockDb({});
    const results = await processWebhookBatch(db, [
      { envelope: gameEnvelope(1, "Ok") },
      { envelope: gameEnvelope(2, "Bad") },
    ]);
    expect(results.map((row) => row.status)).toEqual(["processed", "failed"]);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(updates.some((patch) => patch.error?.includes("game_themes"))).toBe(
      true,
    );
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
