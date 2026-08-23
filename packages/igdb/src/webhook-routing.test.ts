import { describe, expect, it } from "vitest";
import {
  formatIgdbWebhookSecret,
  inferWebhookEntityFromPayload,
  resolveWebhookRouting,
  verifyIgdbWebhookSecret,
} from "./webhook-routing";
import { assertIgdbGame, assertIgdbCover } from "./webhook-apply-parsers";
import {
  clampDrainSettings,
  clampDeliveryMode,
  desiredQueueOpen,
  nextScheduledCloseAt,
  drainBatchSize,
  drainVisibilityTimeoutMs,
  isDrainLocked,
  parseDrainContinue,
  parseDrainHop,
  parseDrainLock,
  parseQueuePullBacklogCount,
  shouldChainDrain,
  shouldRunDrain,
  isDrainPullExhausted,
  WORKER_DRAIN_BATCH_CEILING,
} from "./webhook-settings";
import { timingSafeEqualString } from "./timing-safe";

describe("timingSafeEqualString", () => {
  it("matches equal secrets", () => {
    expect(timingSafeEqualString("abc", "abc")).toBe(true);
    expect(timingSafeEqualString("abc", "abd")).toBe(false);
    expect(timingSafeEqualString("abc", "ab")).toBe(false);
  });
});

describe("webhook routing", () => {
  const base = "base-secret";

  it("verifies typed and base secrets", () => {
    expect(verifyIgdbWebhookSecret(base, base)).toBe(true);
    expect(
      verifyIgdbWebhookSecret(formatIgdbWebhookSecret(base, "games", "create"), base),
    ).toBe(true);
    expect(verifyIgdbWebhookSecret("wrong", base)).toBe(false);
  });

  it("routes from typed secret first", () => {
    const routed = resolveWebhookRouting({
      receivedSecret: formatIgdbWebhookSecret(base, "covers", "update"),
      baseSecret: base,
      endpointHeader: "games",
      operationHeader: "create",
      payload: { id: 1, name: "X" },
    });
    expect(routed).toEqual({ entity: "covers", method: "update" });
  });

  it("infers cover entity from payload", () => {
    expect(inferWebhookEntityFromPayload({ id: 1, image_id: "abc" })).toBe(
      "covers",
    );
  });
});

describe("webhook parsers", () => {
  it("parses game and cover payloads", () => {
    expect(
      assertIgdbGame({
        id: 10,
        name: "Test",
        platforms: [1, 2],
        total_rating: 80.2,
      }),
    ).toMatchObject({
      id: 10,
      name: "Test",
      platforms: [1, 2],
      total_rating: 80.2,
    });
    expect(
      assertIgdbCover({ id: 3, image_id: "img", width: 100, height: 200 }),
    ).toMatchObject({ id: 3, image_id: "img", width: 100, height: 200 });
  });
});

describe("drain settings", () => {
  it("clamps interval and batch size", () => {
    expect(
      clampDrainSettings({
        intervalMinutes: 0,
        maxMessagesPerDrain: 500,
        paused: true,
      }),
    ).toEqual({
      processingMode: "queued",
      deliveryMode: "closed",
      intervalMinutes: 1,
      windowMinutes: 1,
      maxMessagesPerDrain: 100,
      paused: true,
      lastDrainAt: null,
      forceOpenUntil: null,
      drainPending: false,
    });
  });

  it("accepts live processing mode", () => {
    expect(clampDrainSettings({ processingMode: "live" }).processingMode).toBe(
      "live",
    );
    expect(
      shouldRunDrain(
        clampDrainSettings({
          processingMode: "live",
          paused: false,
          lastDrainAt: null,
        }),
      ),
    ).toBe(false);
  });

  it("honors interval before next drain", () => {
    const settings = clampDrainSettings({
      intervalMinutes: 15,
      maxMessagesPerDrain: 10,
      paused: false,
      lastDrainAt: "2026-08-20T12:00:00.000Z",
    });
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:10:00.000Z")),
    ).toBe(false);
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:15:00.000Z")),
    ).toBe(true);
    expect(
      shouldRunDrain({ ...settings, paused: true }, new Date("2026-08-20T13:00:00.000Z")),
    ).toBe(false);
  });

  it("skips while a drain lock is held", () => {
    const settings = clampDrainSettings({
      lastDrainAt: null,
      paused: false,
    });
    const lock = parseDrainLock({ until: "2026-08-20T12:05:00.000Z" });
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:00:00.000Z"), lock),
    ).toBe(false);
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:06:00.000Z"), lock),
    ).toBe(true);
    expect(isDrainLocked(null)).toBe(false);
  });

  it("keeps draining leftover work even if a lock is held", () => {
    const settings = clampDrainSettings({
      drainPending: true,
      lastDrainAt: "2026-08-20T12:00:00.000Z",
      paused: false,
    });
    const lock = parseDrainLock({ until: "2026-08-20T12:15:00.000Z" });
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:01:00.000Z"), lock),
    ).toBe(true);
  });

  it("caps worker batch size and sizes the queue lease", () => {
    expect(drainBatchSize(100)).toBe(WORKER_DRAIN_BATCH_CEILING);
    expect(drainBatchSize(10)).toBe(10);
    expect(drainVisibilityTimeoutMs(25)).toBe(25 * 15_000);
    expect(drainVisibilityTimeoutMs(1)).toBe(2 * 60_000);
    expect(drainVisibilityTimeoutMs(80)).toBe(40 * 15_000);
  });

  it("chains hops until the cap", () => {
    expect(parseDrainHop("3")).toBe(3);
    expect(parseDrainHop("nope")).toBe(0);
    expect(parseDrainContinue("1")).toBe(true);
    expect(parseDrainContinue(null)).toBe(false);
    expect(shouldChainDrain(true, 0)).toBe(false);
    expect(shouldChainDrain(false, 0)).toBe(true);
    expect(shouldChainDrain(false, 98)).toBe(true);
    expect(shouldChainDrain(false, 99)).toBe(false);
  });

  it("does not treat a short HTTP pull as an empty queue", () => {
    expect(
      isDrainPullExhausted({
        pulled: 10,
        batchSize: 25,
        retried: 0,
        backlogCount: 10,
      }),
    ).toBe(true);
    expect(
      isDrainPullExhausted({
        pulled: 10,
        batchSize: 25,
        retried: 0,
        backlogCount: 80,
      }),
    ).toBe(false);
    expect(
      isDrainPullExhausted({
        pulled: 25,
        batchSize: 25,
        retried: 0,
        backlogCount: 25,
      }),
    ).toBe(false);
    expect(
      isDrainPullExhausted({
        pulled: 8,
        batchSize: 25,
        retried: 2,
        backlogCount: 8,
      }),
    ).toBe(false);
    expect(
      isDrainPullExhausted({
        pulled: 0,
        batchSize: 25,
        retried: 0,
        backlogCount: 4,
      }),
    ).toBe(false);
    expect(
      isDrainPullExhausted({
        pulled: 0,
        batchSize: 25,
        retried: 0,
        backlogCount: null,
      }),
    ).toBe(false);
  });

  it("reads queue backlog from pull metrics, not missing-as-zero", () => {
    expect(
      parseQueuePullBacklogCount({
        metadata: { metrics: { backlog_count: 14000 } },
      }),
    ).toBe(14000);
    expect(parseQueuePullBacklogCount({ message_backlog_count: 12 })).toBe(12);
    expect(parseQueuePullBacklogCount({ messages: [] })).toBeNull();
  });

  it("maps paused to closed delivery and honors sticky open", () => {
    expect(clampDeliveryMode(undefined, true)).toBe("closed");
    expect(clampDeliveryMode("open")).toBe("open");
    expect(
      desiredQueueOpen(
        { deliveryMode: "closed", intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:00:00.000Z"),
      ),
    ).toBe(false);
    expect(
      desiredQueueOpen(
        { deliveryMode: "open", intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:14:00.000Z"),
      ),
    ).toBe(true);
    expect(
      desiredQueueOpen(
        { deliveryMode: "auto", intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:00:00.000Z"),
      ),
    ).toBe(true);
    expect(
      desiredQueueOpen(
        { deliveryMode: "auto", intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:06:00.000Z"),
      ),
    ).toBe(false);
    expect(
      nextScheduledCloseAt(
        { intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:00:00.000Z"),
      ).toISOString(),
    ).toBe("2026-08-22T12:05:00.000Z");
    expect(
      nextScheduledCloseAt(
        { intervalMinutes: 15, windowMinutes: 5 },
        new Date("2026-08-22T12:06:00.000Z"),
      ).toISOString(),
    ).toBe("2026-08-22T12:20:00.000Z");
    expect(
      nextScheduledCloseAt(
        { intervalMinutes: 60, windowMinutes: 5 },
        new Date("2026-08-22T12:30:00.000Z"),
      ).toISOString(),
    ).toBe("2026-08-22T13:05:00.000Z");
    expect(
      desiredQueueOpen(
        {
          deliveryMode: "auto",
          intervalMinutes: 15,
          windowMinutes: 5,
          forceOpenUntil: "2026-08-22T12:20:00.000Z",
        },
        new Date("2026-08-22T12:06:00.000Z"),
      ),
    ).toBe(true);
    expect(
      desiredQueueOpen(
        {
          deliveryMode: "auto",
          intervalMinutes: 15,
          windowMinutes: 5,
          forceOpenUntil: "2026-08-22T12:20:00.000Z",
        },
        new Date("2026-08-22T12:20:00.000Z"),
      ),
    ).toBe(false);
  });

  it("keeps pulling every minute while the queue still has work", () => {
    const settings = clampDrainSettings({
      intervalMinutes: 15,
      paused: false,
      lastDrainAt: "2026-08-20T12:00:00.000Z",
      drainPending: true,
    });
    expect(
      shouldRunDrain(settings, new Date("2026-08-20T12:01:00.000Z")),
    ).toBe(true);
  });
});
